ALTER TABLE vehicle_updates ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE vehicle_updates ADD COLUMN IF NOT EXISTS new_data JSONB;

-- Ensure proper permissions on vehicle_updates
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_updates TO anon, authenticated, service_role;
