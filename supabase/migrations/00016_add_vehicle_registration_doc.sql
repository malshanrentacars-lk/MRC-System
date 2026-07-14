-- Add vehicle registration document columns
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS registration_document_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_document_path TEXT;
