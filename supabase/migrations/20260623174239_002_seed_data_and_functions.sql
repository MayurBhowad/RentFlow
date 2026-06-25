/*
# RentFlow - Seed Data and Helper Functions

1. New Functions
- `get_dashboard_stats` - Returns aggregated dashboard metrics for owners
- `get_tenant_dashboard_stats` - Returns aggregated dashboard metrics for tenants
- `generate_monthly_bill` - Generates a bill for a tenant for a given month
- `mark_bill_overdue` - Updates bill status to overdue if past due date

2. Seed Data
- Default utility types for demo (will be created per owner)
*/

-- Function to get owner dashboard stats
CREATE OR REPLACE FUNCTION get_owner_dashboard_stats(p_owner_id uuid)
RETURNS TABLE (
  total_properties bigint,
  active_tenants bigint,
  current_month_revenue numeric,
  pending_payments numeric,
  overdue_amount numeric,
  collection_rate numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_month date := date_trunc('month', CURRENT_DATE);
  v_total_due numeric;
BEGIN
  -- Total properties
  SELECT COUNT(*) INTO total_properties FROM properties WHERE owner_id = p_owner_id;
  
  -- Active tenants
  SELECT COUNT(*) INTO active_tenants FROM tenants WHERE owner_id = p_owner_id AND status = 'active';
  
  -- Current month revenue (paid)
  SELECT COALESCE(SUM(amount_paid), 0) INTO current_month_revenue 
  FROM monthly_bills 
  WHERE owner_id = p_owner_id AND bill_month = v_current_month;
  
  -- Pending payments
  SELECT COALESCE(SUM(balance_due), 0) INTO pending_payments 
  FROM monthly_bills 
  WHERE owner_id = p_owner_id AND status IN ('pending', 'partially_paid');
  
  -- Overdue amount
  SELECT COALESCE(SUM(balance_due), 0) INTO overdue_amount 
  FROM monthly_bills 
  WHERE owner_id = p_owner_id AND status = 'overdue';
  
  -- Collection rate
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

-- Function to get tenant dashboard stats
CREATE OR REPLACE FUNCTION get_tenant_dashboard_stats(p_user_id uuid)
RETURNS TABLE (
  current_rent_due numeric,
  total_utility_charges numeric,
  next_due_date date,
  amount_paid_this_year numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Current rent due
  SELECT COALESCE(SUM(balance_due), 0) INTO current_rent_due 
  FROM monthly_bills mb
  JOIN tenants t ON t.id = mb.tenant_id
  WHERE t.user_id = p_user_id AND mb.status IN ('pending', 'partially_paid', 'overdue');
  
  -- Total utility charges this month
  SELECT COALESCE(SUM(total_utility_amount), 0) INTO total_utility_charges 
  FROM monthly_bills mb
  JOIN tenants t ON t.id = mb.tenant_id
  WHERE t.user_id = p_user_id AND mb.bill_month = date_trunc('month', CURRENT_DATE);
  
  -- Next due date
  SELECT MIN(due_date) INTO next_due_date 
  FROM monthly_bills mb
  JOIN tenants t ON t.id = mb.tenant_id
  WHERE t.user_id = p_user_id AND mb.status IN ('pending', 'partially_paid');
  
  -- Amount paid this year
  SELECT COALESCE(SUM(p.amount), 0) INTO amount_paid_this_year 
  FROM payments p
  JOIN monthly_bills mb ON mb.id = p.monthly_bill_id
  JOIN tenants t ON t.id = mb.tenant_id
  WHERE t.user_id = p_user_id AND p.payment_date >= date_trunc('year', CURRENT_DATE);
  
  RETURN NEXT;
END;
$$;

-- Function to generate monthly bill
CREATE OR REPLACE FUNCTION generate_monthly_bill(
  p_tenant_id uuid,
  p_bill_month date,
  p_utility_amounts jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_record record;
  v_bill_id uuid;
  v_total_utility numeric := 0;
  v_due_date date;
  v_utility jsonb;
BEGIN
  -- Get tenant details
  SELECT * INTO v_tenant_record FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;
  
  -- Calculate due date
  v_due_date := p_bill_month + (v_tenant_record.due_day || ' days')::interval;
  
  -- Calculate total utility amount from JSON
  FOR v_utility IN SELECT * FROM jsonb_array_elements(p_utility_amounts)
  LOOP
    v_total_utility := v_total_utility + COALESCE((v_utility->>'amount')::numeric, 0);
  END LOOP;
  
  -- Insert monthly bill
  INSERT INTO monthly_bills (
    owner_id, property_id, tenant_id, bill_month, rent_amount,
    total_utility_amount, total_amount, balance_due, due_date
  ) VALUES (
    v_tenant_record.owner_id, v_tenant_record.property_id, p_tenant_id,
    p_bill_month, v_tenant_record.rent_amount, v_total_utility,
    v_tenant_record.rent_amount + v_total_utility,
    v_tenant_record.rent_amount + v_total_utility, v_due_date
  ) RETURNING id INTO v_bill_id;
  
  -- Insert utility bills
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

-- Trigger function to update bill status to overdue
CREATE OR REPLACE FUNCTION check_overdue_bills()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE monthly_bills 
  SET status = 'overdue', updated_at = now()
  WHERE status IN ('pending', 'partially_paid') AND due_date < CURRENT_DATE;
  RETURN NULL;
END;
$$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_check_overdue ON monthly_bills;
CREATE TRIGGER trigger_check_overdue
  AFTER INSERT OR UPDATE ON monthly_bills
  EXECUTE FUNCTION check_overdue_bills();
