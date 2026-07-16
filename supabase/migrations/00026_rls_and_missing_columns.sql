-- Missing columns from 00003_final_migration.sql that were applied directly to production
ALTER TABLE customers ADD COLUMN IF NOT EXISTS utility_bill_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS utility_bill_path TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS driving_license_front_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS driving_license_front_path TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS driving_license_back_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS driving_license_back_path TEXT;

ALTER TABLE guarantors ADD COLUMN IF NOT EXISTS utility_bill_url TEXT;
ALTER TABLE guarantors ADD COLUMN IF NOT EXISTS utility_bill_path TEXT;

ALTER TABLE rentals ADD COLUMN IF NOT EXISTS signed_agreement_url TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS signed_agreement_path TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS payment_notes TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- RLS: Enable on tables that were missing it
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_updates ENABLE ROW LEVEL SECURITY;

-- RLS: Add Deny anon policies on tables missing them (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agreement_templates' AND policyname = 'Deny anon') THEN
    CREATE POLICY "Deny anon" ON agreement_templates FOR ALL TO anon USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_updates' AND policyname = 'Deny anon') THEN
    CREATE POLICY "Deny anon" ON vehicle_updates FOR ALL TO anon USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance' AND policyname = 'Deny anon') THEN
    CREATE POLICY "Deny anon" ON attendance FOR ALL TO anon USING (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Deny anon') THEN
    CREATE POLICY "Deny anon" ON companies FOR ALL TO anon USING (false);
  END IF;
END
$$;

-- Note: activity_logs has RLS enabled but intentionally no policies (service_role bypasses)
