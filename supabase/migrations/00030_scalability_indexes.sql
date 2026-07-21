-- ============================================================
-- 00030: Scalability Indexes
-- - pg_trgm indexes for ILIKE search columns
-- - Missing FK indexes
-- - Composite indexes for common query patterns
-- ============================================================

-- Enable trigram extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Trigram (GIN) indexes for ILIKE '%term%' searches ───

-- vehicles: reg_number, brand, model
CREATE INDEX IF NOT EXISTS idx_vehicles_search_trgm ON vehicles
  USING gin ((reg_number || ' ' || brand || ' ' || COALESCE(model, '')) gin_trgm_ops);

-- customers (now via contacts): name, nic, phone
CREATE INDEX IF NOT EXISTS idx_contacts_search_trgm ON contacts
  USING gin ((name || ' ' || COALESCE(nic, '') || ' ' || COALESCE(phone, '')) gin_trgm_ops);

-- suppliers (now via contacts): name, phone, nic
-- (covered by idx_contacts_search_trgm above)

-- guarantors (now via contacts): name, nic, phone
-- (covered by idx_contacts_search_trgm above)

-- companies: name, phone, email
CREATE INDEX IF NOT EXISTS idx_companies_search_trgm ON companies
  USING gin ((name || ' ' || COALESCE(phone, '') || ' ' || COALESCE(email, '')) gin_trgm_ops);

-- rentals: rental_number
CREATE INDEX IF NOT EXISTS idx_rentals_rental_number_trgm ON rentals
  USING gin (rental_number gin_trgm_ops);

-- ─── Missing Foreign Key indexes ───

CREATE INDEX IF NOT EXISTS idx_rentals_guarantor_id ON rentals(guarantor_id);
CREATE INDEX IF NOT EXISTS idx_rentals_created_by ON rentals(created_by);
CREATE INDEX IF NOT EXISTS idx_vehicles_supplier_id ON vehicles(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_guarantors_customer_id ON guarantors(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_exchanges_rental_id ON vehicle_exchanges(rental_id);

-- ─── Composite indexes for common filtered queries ───

-- rentals list queries often filter by status + payment_status + order by created_at
CREATE INDEX IF NOT EXISTS idx_rentals_status_payment_created ON rentals(status, payment_status, created_at DESC);

-- vehicles list queries filter by is_active + status (already partially covered by idx_vehicles_is_active_status_type_source)
-- but source-based filtering with supplier_id benefits from:
CREATE INDEX IF NOT EXISTS idx_vehicles_source_supplier ON vehicles(source, supplier_id) WHERE is_active = true;

-- contact-based FKs on role tables
CREATE INDEX IF NOT EXISTS idx_customers_contact_id ON customers(contact_id);
CREATE INDEX IF NOT EXISTS idx_guarantors_contact_id ON guarantors(contact_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_contact_id ON suppliers(contact_id);

-- (WhatsApp message logs index skipped — table not deployed on this instance)
