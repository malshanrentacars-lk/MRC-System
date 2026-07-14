-- Add missing bank detail columns to the suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS branch TEXT;

-- Add missing registration document columns to the vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_document_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_document_path TEXT;

-- Add new utility bill and driving license columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS utility_bill_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS utility_bill_path TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS driving_license_front_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS driving_license_front_path TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS driving_license_back_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS driving_license_back_path TEXT;

ALTER TABLE guarantors ADD COLUMN IF NOT EXISTS utility_bill_url TEXT;
ALTER TABLE guarantors ADD COLUMN IF NOT EXISTS utility_bill_path TEXT;

-- Add new vehicle document columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS revenue_license_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS revenue_license_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eco_test_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eco_test_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS service_tag_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS service_tag_path TEXT;

-- Add signed agreement columns to rentals
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS signed_agreement_url TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS signed_agreement_path TEXT;

-- Add rental payment tracking columns
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS payment_notes TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Add eco_test_expiry to vehicles (if not already present via initial schema)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eco_test_expiry DATE;

-- Add supplier payment tracking columns to vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS payment_frequency TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS payment_days TEXT;
