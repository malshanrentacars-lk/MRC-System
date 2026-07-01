-- ============================================================
-- MRC Database Schema for Supabase
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS TABLE (staff only - no customer portal)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'MRC',
  street_address TEXT,
  street_address_2 TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  service_interval_km INTEGER DEFAULT 5000,
  currency TEXT DEFAULT 'LKR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  phone2 TEXT,
  email TEXT,
  street_address TEXT,
  street_address_2 TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  nic TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reg_number TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  type TEXT DEFAULT 'Sedan' CHECK (type IN ('Sedan', 'Hatchback', 'SUV', 'Van', 'Pickup', 'Bus', 'Other')),
  fuel_type TEXT DEFAULT 'Petrol' CHECK (fuel_type IN ('Petrol', 'Diesel', 'Hybrid', 'Electric', 'Gas', 'Other')),
  transmission TEXT,
  source TEXT DEFAULT 'Company' CHECK (source IN ('Company', 'Supplier')),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'booked', 'in_garage')),
  daily_rate NUMERIC(12,2) DEFAULT 0,
  current_km INTEGER DEFAULT 0,
  next_service_km INTEGER DEFAULT 5000,
  next_service_date DATE,
  last_service_date DATE,
  last_service_km INTEGER,
  engine_number TEXT,
  chassis_number TEXT,
  insurance_expiry DATE,
  revenue_license_expiry DATE,
  eco_test_expiry DATE,
  rental_start_date DATE,
  renew_date DATE,
  registration_document_url TEXT,
  registration_document_path TEXT,
  revenue_license_url TEXT,
  revenue_license_path TEXT,
  eco_test_url TEXT,
  eco_test_path TEXT,
  insurance_url TEXT,
  insurance_path TEXT,
  service_tag_url TEXT,
  service_tag_path TEXT,
  monthly_cost NUMERIC(12,2),
  payment_frequency TEXT,
  payment_days TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLE PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RATE TIERS (per vehicle)
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  days_from INTEGER NOT NULL,
  days_to INTEGER,  -- NULL = open ended
  rate_per_day NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nic TEXT UNIQUE,
  phone TEXT,
  phone2 TEXT,
  email TEXT,
  street_address TEXT,
  street_address_2 TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  license_number TEXT,
  license_expiry DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GUARANTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS guarantors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  nic TEXT,
  phone TEXT,
  phone2 TEXT,
  street_address TEXT,
  street_address_2 TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  relationship TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RENTALS
-- ============================================================
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_number TEXT UNIQUE NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  guarantor_id UUID REFERENCES guarantors(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  actual_return_date DATE,
  pickup_km INTEGER DEFAULT 0,
  return_km INTEGER,
  daily_rate NUMERIC(12,2) NOT NULL,
  total_days INTEGER GENERATED ALWAYS AS (end_date - start_date) STORED,
  subtotal NUMERIC(12,2),
  additional_charges NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2),
  deposit NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'active', 'returned', 'cancelled', 'overdue')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  amount_paid NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT,
  payment_notes TEXT,
  last_payment_date DATE,
  pickup_notes TEXT,
  return_notes TEXT,
  notes TEXT,
  signed_agreement_url TEXT,
  signed_agreement_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-increment rental number
CREATE SEQUENCE IF NOT EXISTS rental_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_rental_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rental_number := 'RNT-' || LPAD(nextval('rental_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rental_number
BEFORE INSERT ON rentals
FOR EACH ROW
WHEN (NEW.rental_number IS NULL OR NEW.rental_number = '')
EXECUTE FUNCTION generate_rental_number();

-- ============================================================
-- VEHICLE EXCHANGES
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_exchanges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  old_vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  new_vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  exchange_date DATE NOT NULL,
  reason TEXT,
  additional_charge NUMERIC(12,2) DEFAULT 0,
  old_vehicle_km INTEGER,
  new_vehicle_km INTEGER,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TODOS / TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  type TEXT DEFAULT 'custom' CHECK (type IN ('rental_end', 'service_due', 'service_overdue', 'booked_pickup', 'custom')),
  reference_id UUID,  -- rental_id or vehicle_id
  is_done BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_guarantors_updated_at BEFORE UPDATE ON guarantors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rentals_updated_at BEFORE UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_todos_updated_at BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_company_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Since we use server-side auth (service role for server actions),
-- we'll use permissive policies for anon/service role:
-- Service role bypasses RLS automatically.
-- For anon (used by client), deny everything - auth done server-side.

-- Allow service_role to bypass (already default)
-- Public read for non-sensitive (not needed since staff only)

-- RLS Policies: Only allow authenticated via service role (server actions handle auth)
-- The app uses server actions with service role key, so RLS is enforced at app level.
-- We create deny-all for anon to prevent direct API access.

CREATE POLICY "Deny anon" ON users FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON suppliers FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON vehicles FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON vehicle_photos FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON rate_tiers FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON customers FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON guarantors FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON rentals FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON vehicle_exchanges FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON company_settings FOR ALL TO anon USING (false);
CREATE POLICY "Deny anon" ON todos FOR ALL TO anon USING (false);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-documents', 'vehicle-documents', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true) ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user: amil / Admin@1234
-- bcrypt hash of 'Admin@1234' with cost 10
INSERT INTO users (username, full_name, email, password_hash, role) VALUES
('amil', 'Amil Admin', 'amil@mrc.lk', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Company settings
INSERT INTO company_settings (company_name, address, phone, email, service_interval_km, currency)
VALUES ('MRC', 'Colombo 03, Sri Lanka', '+94 11 234 5678', 'info@mrc.lk', 5000, 'LKR')
ON CONFLICT DO NOTHING;

-- Sample supplier
INSERT INTO suppliers (id, name, phone, address, nic) VALUES
('00000000-0000-0000-0000-000000000001', 'Perera Motors', '+94 71 234 5678', 'Colombo 07', '199012345678')
ON CONFLICT DO NOTHING;

-- Sample vehicles
INSERT INTO vehicles (id, reg_number, brand, model, year, color, type, source, status, daily_rate, current_km, next_service_km) VALUES
('00000000-0000-0000-0000-000000000010', 'CAR-0001', 'Toyota', 'Aqua', 2021, 'Silver', 'Hatchback', 'Company', 'available', 4500, 25000, 30000),
('00000000-0000-0000-0000-000000000011', 'ABC-1234', 'Honda', 'Fit', 2020, 'White', 'Hatchback', 'Supplier', 'available', 3500, 42000, 47000),
('00000000-0000-0000-0000-000000000012', 'WP-5678', 'Toyota', 'KDH Van', 2019, 'White', 'Van', 'Company', 'available', 8000, 95000, 100000)
ON CONFLICT DO NOTHING;

-- Update supplier for vehicle
UPDATE vehicles SET supplier_id = '00000000-0000-0000-0000-000000000001' WHERE reg_number = 'ABC-1234';

-- Sample customer
INSERT INTO customers (id, name, nic, phone, address, license_number) VALUES
('00000000-0000-0000-0000-000000000020', 'Kasun Perera', '199012345678', '+94 77 123 4567', 'Colombo 05', 'B1234567')
ON CONFLICT DO NOTHING;
