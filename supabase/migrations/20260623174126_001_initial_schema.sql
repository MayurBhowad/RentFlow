/*
# Dwello - Initial Schema Migration

1. New Tables
- `profiles` - Extended user profiles linked to auth.users
- `properties` - Properties owned by users
- `tenants` - Tenant records linked to properties and users
- `utility_types` - Configurable utility types (electricity, water, etc.)
- `monthly_bills` - Monthly bills combining rent and utilities
- `utility_bills` - Individual utility charges for a bill
- `payments` - Payment records for bills
- `notifications` - In-app notifications
- `audit_logs` - System audit trail

2. Security
- Enable RLS on all tables
- Owner-scoped policies for properties, tenants, bills
- Tenant-scoped policies for viewing their own data
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'tenant' CHECK (role IN ('owner', 'tenant', 'manager')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text,
  zip_code text,
  country text DEFAULT 'India',
  property_type text DEFAULT 'apartment' CHECK (property_type IN ('apartment', 'house', 'villa', 'commercial', 'other')),
  total_units integer DEFAULT 1,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_properties" ON properties;
CREATE POLICY "select_own_properties" ON properties FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_properties" ON properties;
CREATE POLICY "insert_own_properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_properties" ON properties;
CREATE POLICY "update_own_properties" ON properties FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_properties" ON properties;
CREATE POLICY "delete_own_properties" ON properties FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text NOT NULL,
  emergency_contact text,
  rent_amount numeric(12,2) NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'half_yearly', 'yearly', 'custom')),
  due_day integer NOT NULL DEFAULT 5,
  lease_start date NOT NULL,
  lease_end date,
  security_deposit numeric(12,2) DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'notice_given', 'evicted')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tenants" ON tenants;
CREATE POLICY "select_own_tenants" ON tenants FOR SELECT
  TO authenticated USING (auth.uid() = owner_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tenants" ON tenants;
CREATE POLICY "insert_own_tenants" ON tenants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_tenants" ON tenants;
CREATE POLICY "update_own_tenants" ON tenants FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_tenants" ON tenants;
CREATE POLICY "delete_own_tenants" ON tenants FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Utility types table
CREATE TABLE IF NOT EXISTS utility_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  charge_type text NOT NULL DEFAULT 'fixed' CHECK (charge_type IN ('fixed', 'variable')),
  default_amount numeric(12,2),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE utility_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_utility_types" ON utility_types;
CREATE POLICY "select_own_utility_types" ON utility_types FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_utility_types" ON utility_types;
CREATE POLICY "insert_own_utility_types" ON utility_types FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_utility_types" ON utility_types;
CREATE POLICY "update_own_utility_types" ON utility_types FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_utility_types" ON utility_types;
CREATE POLICY "delete_own_utility_types" ON utility_types FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Monthly bills table
CREATE TABLE IF NOT EXISTS monthly_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bill_month date NOT NULL,
  rent_amount numeric(12,2) NOT NULL,
  total_utility_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  amount_paid numeric(12,2) DEFAULT 0,
  balance_due numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('paid', 'partially_paid', 'pending', 'overdue')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE monthly_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bills" ON monthly_bills;
CREATE POLICY "select_own_bills" ON monthly_bills FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id OR 
    EXISTS (SELECT 1 FROM tenants WHERE tenants.id = monthly_bills.tenant_id AND tenants.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_bills" ON monthly_bills;
CREATE POLICY "insert_own_bills" ON monthly_bills FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_bills" ON monthly_bills;
CREATE POLICY "update_own_bills" ON monthly_bills FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_bills" ON monthly_bills;
CREATE POLICY "delete_own_bills" ON monthly_bills FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Utility bills table
CREATE TABLE IF NOT EXISTS utility_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_bill_id uuid NOT NULL REFERENCES monthly_bills(id) ON DELETE CASCADE,
  utility_type_id uuid NOT NULL REFERENCES utility_types(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  units_consumed numeric(12,2),
  rate_per_unit numeric(12,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_utility_bills" ON utility_bills;
CREATE POLICY "select_own_utility_bills" ON utility_bills FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM monthly_bills 
      WHERE monthly_bills.id = utility_bills.monthly_bill_id 
      AND (monthly_bills.owner_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM tenants WHERE tenants.id = monthly_bills.tenant_id AND tenants.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "insert_own_utility_bills" ON utility_bills;
CREATE POLICY "insert_own_utility_bills" ON utility_bills FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM monthly_bills WHERE monthly_bills.id = utility_bills.monthly_bill_id AND monthly_bills.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_utility_bills" ON utility_bills;
CREATE POLICY "update_own_utility_bills" ON utility_bills FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM monthly_bills WHERE monthly_bills.id = utility_bills.monthly_bill_id AND monthly_bills.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM monthly_bills WHERE monthly_bills.id = utility_bills.monthly_bill_id AND monthly_bills.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_utility_bills" ON utility_bills;
CREATE POLICY "delete_own_utility_bills" ON utility_bills FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM monthly_bills WHERE monthly_bills.id = utility_bills.monthly_bill_id AND monthly_bills.owner_id = auth.uid())
  );

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_bill_id uuid NOT NULL REFERENCES monthly_bills(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
  transaction_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM monthly_bills 
      WHERE monthly_bills.id = payments.monthly_bill_id 
      AND (monthly_bills.owner_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM tenants WHERE tenants.id = monthly_bills.tenant_id AND tenants.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM monthly_bills WHERE monthly_bills.id = payments.monthly_bill_id AND monthly_bills.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM monthly_bills WHERE monthly_bills.id = payments.monthly_bill_id AND monthly_bills.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM monthly_bills WHERE monthly_bills.id = payments.monthly_bill_id AND monthly_bills.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM monthly_bills WHERE monthly_bills.id = payments.monthly_bill_id AND monthly_bills.owner_id = auth.uid())
  );

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read boolean DEFAULT false,
  related_bill_id uuid REFERENCES monthly_bills(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audit_logs" ON audit_logs;
CREATE POLICY "select_own_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_owner ON monthly_bills(owner_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_tenant ON monthly_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_status ON monthly_bills(status);
CREATE INDEX IF NOT EXISTS idx_monthly_bills_bill_month ON monthly_bills(bill_month);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(monthly_bill_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_monthly ON utility_bills(monthly_bill_id);
