-- Allow tenants to read utility type names on their own bills.
-- Owners already have select_own_utility_types (auth.uid() = owner_id).

DROP POLICY IF EXISTS "select_utility_types_on_tenant_bills" ON utility_types;
CREATE POLICY "select_utility_types_on_tenant_bills" ON utility_types FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM utility_bills ub
      JOIN monthly_bills mb ON mb.id = ub.monthly_bill_id
      JOIN tenants t ON t.id = mb.tenant_id
      WHERE ub.utility_type_id = utility_types.id
        AND t.user_id = auth.uid()
    )
  );
