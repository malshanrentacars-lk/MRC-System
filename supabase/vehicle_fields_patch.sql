-- MRC Schema Update: New vehicle fields
-- Run this in Supabase SQL Editor

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS transmission TEXT,
  ADD COLUMN IF NOT EXISTS eco_test_expiry DATE,
  ADD COLUMN IF NOT EXISTS handover_date DATE,
  ADD COLUMN IF NOT EXISTS agreement_end_date DATE,
  ADD COLUMN IF NOT EXISTS payment_type TEXT;

-- Note: engine_number and chassis_number are kept (old data) but won't be used in new forms
-- Optional: drop old columns if no existing data
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS engine_number;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS chassis_number;
