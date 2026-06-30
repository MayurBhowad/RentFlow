-- Multi-tenant scoping: enforce auth checks on SECURITY DEFINER functions
-- and auto-link tenant records to registered auth users by email.

-- Link tenant rows when a user signs up with a matching email
CREATE OR REPLACE FUNCTION public.link_tenant_to_user_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.tenants
    SET user_id = NEW.id, updated_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Extend handle_new_user to link existing tenant records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');
  IF user_role NOT IN ('owner', 'tenant', 'manager') THEN
    user_role := 'tenant';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    user_role
  );

  IF user_role = 'owner' THEN
    INSERT INTO public.utility_types (owner_id, name, charge_type, description)
    VALUES
      (NEW.id, 'Electricity', 'variable', 'Electricity bill'),
      (NEW.id, 'Water', 'variable', 'Water bill'),
      (NEW.id, 'Gas', 'variable', 'Gas bill'),
      (NEW.id, 'Internet', 'fixed', 'Internet / WiFi'),
      (NEW.id, 'Maintenance', 'fixed', 'Maintenance charges');
  END IF;

  -- Link any tenant records that were created by an owner with this email
  IF NEW.email IS NOT NULL THEN
    UPDATE public.tenants
    SET user_id = NEW.id, updated_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Link tenant to auth user when owner adds/updates tenant email
CREATE OR REPLACE FUNCTION public.link_tenant_on_save()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_user_id uuid;
BEGIN
  IF NEW.email IS NOT NULL THEN
    SELECT id INTO matched_user_id
    FROM auth.users
    WHERE lower(email) = lower(NEW.email)
    LIMIT 1;

    IF matched_user_id IS NOT NULL THEN
      NEW.user_id := matched_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_tenant_on_insert ON public.tenants;
CREATE TRIGGER link_tenant_on_insert
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.link_tenant_on_save();

DROP TRIGGER IF EXISTS link_tenant_on_update ON public.tenants;
CREATE TRIGGER link_tenant_on_update
  BEFORE UPDATE OF email ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.link_tenant_on_save();

-- Owner dashboard stats: only callable for the authenticated owner
CREATE OR REPLACE FUNCTION get_owner_dashboard_stats(p_owner_id uuid)
RETURNS TABLE (
  total_properties bigint,
  active_tenants bigint,
  current_month_revenue numeric,
  pending_payments numeric,
  overdue_amount numeric,
  collection_rate numeric
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month date := date_trunc('month', CURRENT_DATE);
  v_total_due numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO total_properties FROM properties WHERE owner_id = p_owner_id;
  SELECT COUNT(*) INTO active_tenants FROM tenants WHERE owner_id = p_owner_id AND status = 'active';

  SELECT COALESCE(SUM(amount_paid), 0) INTO current_month_revenue
  FROM monthly_bills
  WHERE owner_id = p_owner_id AND bill_month = v_current_month;

  SELECT COALESCE(SUM(balance_due), 0) INTO pending_payments
  FROM monthly_bills
  WHERE owner_id = p_owner_id AND status IN ('pending', 'partially_paid');

  SELECT COALESCE(SUM(balance_due), 0) INTO overdue_amount
  FROM monthly_bills
  WHERE owner_id = p_owner_id AND status = 'overdue';

  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_due
  FROM monthly_bills
  WHERE owner_id = p_owner_id AND bill_month = v_current_month;

  IF v_total_due > 0 THEN
    collection_rate := ROUND((current_month_revenue / v_total_due) * 100, 2);
  ELSE
    collection_rate := 100;
  END IF;

  RETURN NEXT;
END;
$$;

-- Tenant dashboard stats: only callable for the authenticated tenant user
CREATE OR REPLACE FUNCTION get_tenant_dashboard_stats(p_user_id uuid)
RETURNS TABLE (
  current_rent_due numeric,
  total_utility_charges numeric,
  next_due_date date,
  amount_paid_this_year numeric
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(SUM(balance_due), 0) INTO current_rent_due
  FROM monthly_bills mb
  JOIN tenants t ON t.id = mb.tenant_id
  WHERE t.user_id = p_user_id AND mb.status IN ('pending', 'partially_paid', 'overdue');

  SELECT COALESCE(SUM(total_utility_amount), 0) INTO total_utility_charges
  FROM monthly_bills mb
  JOIN tenants t ON t.id = mb.tenant_id
  WHERE t.user_id = p_user_id AND mb.bill_month = date_trunc('month', CURRENT_DATE);

  SELECT MIN(due_date) INTO next_due_date
  FROM monthly_bills mb
  JOIN tenants t ON t.id = mb.tenant_id
  WHERE t.user_id = p_user_id AND mb.status IN ('pending', 'partially_paid');

  SELECT COALESCE(SUM(p.amount), 0) INTO amount_paid_this_year
  FROM payments p
  JOIN monthly_bills mb ON mb.id = p.monthly_bill_id
  JOIN tenants t ON t.id = mb.tenant_id
  WHERE t.user_id = p_user_id AND p.payment_date >= date_trunc('year', CURRENT_DATE);

  RETURN NEXT;
END;
$$;

-- Bill generation: only the owning landlord may generate bills for their tenants
CREATE OR REPLACE FUNCTION generate_monthly_bill(
  p_tenant_id uuid,
  p_bill_month date,
  p_utility_amounts jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_record record;
  v_bill_id uuid;
  v_total_utility numeric := 0;
  v_due_date date;
  v_utility jsonb;
BEGIN
  SELECT * INTO v_tenant_record FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_tenant_record.owner_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_due_date := p_bill_month + (v_tenant_record.due_day || ' days')::interval;

  FOR v_utility IN SELECT * FROM jsonb_array_elements(p_utility_amounts)
  LOOP
    v_total_utility := v_total_utility + COALESCE((v_utility->>'amount')::numeric, 0);
  END LOOP;

  INSERT INTO monthly_bills (
    owner_id, property_id, tenant_id, bill_month, rent_amount,
    total_utility_amount, total_amount, balance_due, due_date
  ) VALUES (
    v_tenant_record.owner_id, v_tenant_record.property_id, p_tenant_id,
    p_bill_month, v_tenant_record.rent_amount, v_total_utility,
    v_tenant_record.rent_amount + v_total_utility,
    v_tenant_record.rent_amount + v_total_utility, v_due_date
  ) RETURNING id INTO v_bill_id;

  FOR v_utility IN SELECT * FROM jsonb_array_elements(p_utility_amounts)
  LOOP
    IF (v_utility->>'utility_type_id') IS NOT NULL THEN
      INSERT INTO utility_bills (monthly_bill_id, utility_type_id, amount, notes)
      VALUES (v_bill_id, (v_utility->>'utility_type_id')::uuid, (v_utility->>'amount')::numeric, v_utility->>'notes');
    END IF;
  END LOOP;

  RETURN v_bill_id;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_monthly_bill(uuid, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_dashboard_stats(uuid) TO authenticated;
