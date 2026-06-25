-- Grant execute on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION generate_monthly_bill(uuid, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_owner_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_dashboard_stats(uuid) TO authenticated;
