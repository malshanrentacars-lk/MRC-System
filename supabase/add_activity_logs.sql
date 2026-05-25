-- ============================================================
-- ============================================================
-- MRC Activity Logs Table
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,          -- matches users.id
  user_name   TEXT NOT NULL,          -- stored at time of action
  user_role   TEXT NOT NULL DEFAULT 'employee',
  action      TEXT NOT NULL,          -- 'created' | 'updated' | 'deleted' | 'activated' | 'returned' | 'cancelled' | 'uploaded' | 'login'
  module      TEXT NOT NULL,          -- 'Vehicles' | 'Customers' | 'Suppliers' | 'Guarantors' | 'Rentals' | 'Users' | 'Settings'
  entity_id   TEXT,                   -- ID of the affected record
  entity_label TEXT,                  -- Human-readable label e.g. "Toyota Camry (CAR-001)"
  details     TEXT,                   -- Extra context
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
