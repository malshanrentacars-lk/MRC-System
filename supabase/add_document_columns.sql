-- ============================================================
-- ============================================================
-- MRC Document URL Columns Migration
-- Run this in your Supabase SQL Editor to add document URL support
-- ============================================================

-- Add document URL columns to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS nic_front_url TEXT,
  ADD COLUMN IF NOT EXISTS nic_back_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add document URL columns to suppliers
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS nic_front_url TEXT,
  ADD COLUMN IF NOT EXISTS nic_back_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add document URL columns to guarantors
ALTER TABLE guarantors
  ADD COLUMN IF NOT EXISTS nic_front_url TEXT,
  ADD COLUMN IF NOT EXISTS nic_back_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Confirm the additions
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns
WHERE table_name IN ('customers', 'suppliers', 'guarantors')
  AND column_name IN ('nic_front_url', 'nic_back_url', 'photo_url')
ORDER BY table_name, column_name;
