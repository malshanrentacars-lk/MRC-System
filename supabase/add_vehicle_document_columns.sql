-- ============================================================
-- Add missing vehicle document columns to existing database
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add document URL and path columns to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eco_test_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_document_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_document_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS revenue_license_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS revenue_license_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eco_test_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eco_test_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS service_tag_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS service_tag_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(12,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS payment_frequency TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS payment_days TEXT;

-- 2. Create the vehicle-documents storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicle-documents', 'vehicle-documents', true) 
ON CONFLICT DO NOTHING;