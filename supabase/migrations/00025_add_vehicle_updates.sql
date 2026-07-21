CREATE TABLE IF NOT EXISTS vehicle_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_km INTEGER,
  description TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_updates_vehicle_id ON vehicle_updates(vehicle_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_updates TO anon, authenticated, service_role;
