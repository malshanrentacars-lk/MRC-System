-- ============================================================
-- Postgres functions for dashboard aggregation (top vehicles, top customers)
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION get_top_vehicles(limit_count INT DEFAULT 10)
RETURNS TABLE(
  vehicle_id UUID,
  reg_number TEXT,
  brand TEXT,
  model TEXT,
  rental_count BIGINT,
  total_revenue NUMERIC
) AS $$
  SELECT
    r.vehicle_id,
    v.reg_number,
    v.brand,
    v.model,
    COUNT(*)::BIGINT,
    COALESCE(SUM(r.total_amount), 0)
  FROM rentals r
  JOIN vehicles v ON v.id = r.vehicle_id
  WHERE r.status != 'cancelled'
  GROUP BY r.vehicle_id, v.reg_number, v.brand, v.model
  ORDER BY COUNT(*) DESC
  LIMIT limit_count;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_top_customers(limit_count INT DEFAULT 10)
RETURNS TABLE(
  customer_id UUID,
  name TEXT,
  phone TEXT,
  rental_count BIGINT,
  total_spent NUMERIC
) AS $$
  SELECT
    r.customer_id,
    c.name,
    COALESCE(c.phone, '')::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(r.total_amount), 0)
  FROM rentals r
  JOIN customers c ON c.id = r.customer_id
  WHERE r.status != 'cancelled'
  GROUP BY r.customer_id, c.name, c.phone
  ORDER BY COUNT(*) DESC
  LIMIT limit_count;
$$ LANGUAGE sql STABLE;
