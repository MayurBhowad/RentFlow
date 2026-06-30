-- Lease lifecycle: bill guards, expired-lease processing, optional daily cron

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
  SELECT * INTO v_tenant_record FROM tenants WHERE id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  IF v_tenant_record.status NOT IN ('active', 'notice_given') THEN
    RAISE EXCEPTION 'Cannot bill tenant with status "%". Only active or notice_given tenants can be billed.', v_tenant_record.status;
  END IF;

  IF v_tenant_record.lease_end IS NOT NULL
     AND date_trunc('month', p_bill_month) > date_trunc('month', v_tenant_record.lease_end) THEN
    RAISE EXCEPTION 'Bill month is after tenant lease end (%)', v_tenant_record.lease_end;
  END IF;

  IF v_tenant_record.lease_end IS NOT NULL
     AND v_tenant_record.lease_end < CURRENT_DATE
     AND v_tenant_record.status IN ('active', 'notice_given') THEN
    RAISE EXCEPTION 'Tenant lease ended on %. Mark tenant inactive or renew the lease before billing.', v_tenant_record.lease_end;
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

CREATE OR REPLACE FUNCTION process_expired_leases(p_owner_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_tenant record;
BEGIN
  IF p_owner_id IS NOT NULL AND auth.uid() IS NOT NULL AND auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'Not authorized to process leases for this owner';
  END IF;

  FOR v_tenant IN
    SELECT id, owner_id, full_name, lease_end
    FROM tenants
    WHERE status IN ('active', 'notice_given')
      AND lease_end IS NOT NULL
      AND lease_end < CURRENT_DATE
      AND (p_owner_id IS NULL OR owner_id = p_owner_id)
  LOOP
    UPDATE tenants
    SET status = 'inactive',
        user_id = NULL,
        updated_at = now()
    WHERE id = v_tenant.id;

    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_tenant.owner_id,
      'Lease ended',
      format('%s''s lease ended on %s. Tenant marked inactive and portal access revoked.',
        v_tenant.full_name, to_char(v_tenant.lease_end, 'DD Mon YYYY')),
      'warning'
    );

    v_count := v_count + 1;
  END LOOP;

  FOR v_tenant IN
    SELECT t.id, t.owner_id, t.full_name, t.lease_end
    FROM tenants t
    WHERE t.status IN ('active', 'notice_given')
      AND t.lease_end IS NOT NULL
      AND t.lease_end >= CURRENT_DATE
      AND t.lease_end <= CURRENT_DATE + interval '30 days'
      AND (p_owner_id IS NULL OR t.owner_id = p_owner_id)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = t.owner_id
          AND n.title = 'Lease expiring soon'
          AND n.message LIKE '%' || t.full_name || '%'
          AND n.created_at > now() - interval '7 days'
      )
  LOOP
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_tenant.owner_id,
      'Lease expiring soon',
      format('%s''s lease ends on %s. Renew or mark inactive when they move out.',
        v_tenant.full_name, to_char(v_tenant.lease_end, 'DD Mon YYYY')),
      'info'
    );
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION process_expired_leases(uuid) TO authenticated;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dwello-process-expired-leases') THEN
      PERFORM cron.unschedule('dwello-process-expired-leases');
    END IF;

    PERFORM cron.schedule(
      'dwello-process-expired-leases',
      '0 6 * * *',
      $$SELECT process_expired_leases(NULL)$$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $do$;
