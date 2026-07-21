ALTER TABLE vehicle_updates ADD COLUMN IF NOT EXISTS update_type TEXT DEFAULT 'general';

GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_updates TO anon, authenticated, service_role;
