-- Add supplier bank details columns
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS bank TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT;
