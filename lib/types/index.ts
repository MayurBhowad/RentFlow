export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'owner' | 'tenant' | 'manager';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  state: string | null;
  zip_code: string | null;
  country: string;
  property_type: 'apartment' | 'house' | 'villa' | 'commercial' | 'other';
  total_units: number;
  description: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  owner_id: string;
  property_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  emergency_contact: string | null;
  rent_amount: number;
  billing_cycle: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';
  due_day: number;
  lease_start: string;
  lease_end: string | null;
  security_deposit: number;
  status: 'active' | 'inactive' | 'notice_given' | 'evicted';
  notes: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
}

export interface UtilityType {
  id: string;
  owner_id: string;
  name: string;
  charge_type: 'fixed' | 'variable';
  default_amount: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MonthlyBill {
  id: string;
  owner_id: string;
  property_id: string;
  tenant_id: string;
  bill_month: string;
  rent_amount: number;
  total_utility_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  due_date: string;
  status: 'paid' | 'partially_paid' | 'pending' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  property?: Property;
  utility_bills?: UtilityBill[];
  payments?: Payment[];
}

export interface UtilityBill {
  id: string;
  monthly_bill_id: string;
  utility_type_id: string;
  amount: number;
  units_consumed: number | null;
  rate_per_unit: number | null;
  notes: string | null;
  created_at: string;
  utility_type?: UtilityType;
}

export interface Payment {
  id: string;
  monthly_bill_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  related_bill_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_properties: number;
  active_tenants: number;
  current_month_revenue: number;
  pending_payments: number;
  overdue_amount: number;
  collection_rate: number;
}

export interface TenantDashboardStats {
  current_rent_due: number;
  total_utility_charges: number;
  next_due_date: string | null;
  amount_paid_this_year: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
export type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';
export type BillStatus = 'paid' | 'partially_paid' | 'pending' | 'overdue';
