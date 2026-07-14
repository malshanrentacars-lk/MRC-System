-- Add old_value and new_value columns to activity_logs for update diff tracking
-- Run this in Supabase SQL Editor if activity_logs table already exists

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS old_value TEXT,
  ADD COLUMN IF NOT EXISTS new_value TEXT;
