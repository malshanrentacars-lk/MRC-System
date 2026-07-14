-- ============================================================
-- Performance Indexes for Core Business Tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- VEHICLES: Filtered on is_active, status, type, source; ordered by created_at
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active_status_type_source
  ON vehicles(is_active, status, type, source);

CREATE INDEX IF NOT EXISTS idx_vehicles_created_at
  ON vehicles(created_at DESC);

-- RENTALS: Filtered on status, vehicle_id, customer_id; ordered by created_at
CREATE INDEX IF NOT EXISTS idx_rentals_status_vehicle_id
  ON rentals(status, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_rentals_customer_id
  ON rentals(customer_id);

CREATE INDEX IF NOT EXISTS idx_rentals_created_at
  ON rentals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rentals_start_end_date
  ON rentals(start_date, end_date);

-- CUSTOMERS: Filtered on is_active; ordered by name
CREATE INDEX IF NOT EXISTS idx_customers_is_active_name
  ON customers(is_active, name);

-- VEHICLE PHOTOS & RATE TIERS: FK joins in vehicle queries
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle_id
  ON vehicle_photos(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_rate_tiers_vehicle_id
  ON rate_tiers(vehicle_id);

-- GUARANTORS: FK join in rental queries
CREATE INDEX IF NOT EXISTS idx_guarantors_id
  ON guarantors(id);
