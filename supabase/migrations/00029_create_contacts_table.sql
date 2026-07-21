-- ============================================================
-- 00029: Unified Contacts Table
-- Extracts shared person/entity fields from customers, suppliers,
-- and guarantors into a single contacts table to eliminate
-- schema duplication and enable cross-role deduplication.
-- ============================================================

-- 1. Create contacts table with all shared columns
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  phone2 TEXT,
  email TEXT,
  nic TEXT,
  street_address TEXT,
  street_address_2 TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  nic_front_url TEXT,
  nic_back_url TEXT,
  photo_url TEXT,
  utility_bill_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on NIC for deduplication (nullable, so multiple NULLs are ok)
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_nic ON contacts(nic) WHERE nic IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

-- updated_at trigger
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Add contact_id columns to role tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE guarantors ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- 3. Migrate customers → contacts (NIC-based dedup)
INSERT INTO contacts (name, phone, phone2, email, nic, street_address, street_address_2, city, postal_code, address, notes, is_active, nic_front_url, nic_back_url, photo_url, utility_bill_url, created_at, updated_at)
SELECT c.name, c.phone, c.phone2, c.email, c.nic,
       c.street_address, c.street_address_2, c.city, c.postal_code, c.address,
       c.notes, c.is_active,
       c.nic_front_url, c.nic_back_url, c.photo_url, c.utility_bill_url,
       COALESCE(c.created_at, NOW()), COALESCE(c.updated_at, NOW())
FROM customers c
WHERE c.nic IS NOT NULL
ON CONFLICT (nic) WHERE nic IS NOT NULL DO NOTHING;

INSERT INTO contacts (name, phone, phone2, email, nic, street_address, street_address_2, city, postal_code, address, notes, is_active, nic_front_url, nic_back_url, photo_url, utility_bill_url, created_at, updated_at)
SELECT c.name, c.phone, c.phone2, c.email, NULL,
       c.street_address, c.street_address_2, c.city, c.postal_code, c.address,
       c.notes, c.is_active,
       c.nic_front_url, c.nic_back_url, c.photo_url, c.utility_bill_url,
       COALESCE(c.created_at, NOW()), COALESCE(c.updated_at, NOW())
FROM customers c
WHERE c.nic IS NULL;

-- Link customers to contacts by NIC (exact match), fallback to name+phone
UPDATE customers cu SET contact_id = co.id
FROM contacts co
WHERE cu.nic IS NOT NULL AND cu.nic = co.nic;

-- For customers without NIC, match by name + phone
UPDATE customers cu SET contact_id = co.id
FROM contacts co
WHERE cu.contact_id IS NULL
  AND cu.name = co.name
  AND cu.phone IS NOT DISTINCT FROM co.phone;

-- For any remaining unmatched (e.g., name/phone mismatch), link by name alone
UPDATE customers cu SET contact_id = co.id
FROM contacts co
WHERE cu.contact_id IS NULL
  AND cu.name = co.name
  AND NOT EXISTS (
    SELECT 1 FROM customers cu2
    WHERE cu2.name = co.name AND cu2.id <> cu.id AND cu2.contact_id = co.id
  );

-- 4. Migrate suppliers → contacts (deduplicate against existing contacts by NIC)
INSERT INTO contacts (name, phone, phone2, email, nic, street_address, street_address_2, city, postal_code, address, notes, is_active, nic_front_url, nic_back_url, photo_url, created_at, updated_at)
SELECT s.name, s.phone, s.phone2, s.email, s.nic,
       s.street_address, s.street_address_2, s.city, s.postal_code, s.address,
       s.notes, s.is_active,
       s.nic_front_url, s.nic_back_url, s.photo_url,
       COALESCE(s.created_at, NOW()), COALESCE(s.updated_at, NOW())
FROM suppliers s
WHERE s.nic IS NOT NULL
ON CONFLICT (nic) WHERE nic IS NOT NULL DO NOTHING;

INSERT INTO contacts (name, phone, phone2, email, nic, street_address, street_address_2, city, postal_code, address, notes, is_active, nic_front_url, nic_back_url, photo_url, created_at, updated_at)
SELECT s.name, s.phone, s.phone2, s.email, NULL,
       s.street_address, s.street_address_2, s.city, s.postal_code, s.address,
       s.notes, s.is_active,
       s.nic_front_url, s.nic_back_url, s.photo_url,
       COALESCE(s.created_at, NOW()), COALESCE(s.updated_at, NOW())
FROM suppliers s
WHERE s.nic IS NULL;

UPDATE suppliers s SET contact_id = co.id
FROM contacts co
WHERE s.nic IS NOT NULL AND s.nic = co.nic;

UPDATE suppliers s SET contact_id = co.id
FROM contacts co
WHERE s.contact_id IS NULL
  AND s.name = co.name
  AND s.phone IS NOT DISTINCT FROM co.phone;

UPDATE suppliers s SET contact_id = co.id
FROM contacts co
WHERE s.contact_id IS NULL
  AND s.name = co.name
  AND NOT EXISTS (
    SELECT 1 FROM suppliers s2
    WHERE s2.name = co.name AND s2.id <> s.id AND s2.contact_id = co.id
  );

-- 5. Migrate guarantors → contacts (deduplicate against existing contacts by NIC)
INSERT INTO contacts (name, phone, phone2, nic, street_address, street_address_2, city, postal_code, address, notes, is_active, nic_front_url, nic_back_url, photo_url, utility_bill_url, created_at, updated_at)
SELECT g.name, g.phone, g.phone2, g.nic,
       g.street_address, g.street_address_2, g.city, g.postal_code, g.address,
       g.notes, true,
       g.nic_front_url, g.nic_back_url, g.photo_url, g.utility_bill_url,
       COALESCE(g.created_at, NOW()), COALESCE(g.updated_at, NOW())
FROM guarantors g
WHERE g.nic IS NOT NULL
ON CONFLICT (nic) WHERE nic IS NOT NULL DO NOTHING;

INSERT INTO contacts (name, phone, phone2, nic, street_address, street_address_2, city, postal_code, address, notes, is_active, nic_front_url, nic_back_url, photo_url, utility_bill_url, created_at, updated_at)
SELECT g.name, g.phone, g.phone2, NULL,
       g.street_address, g.street_address_2, g.city, g.postal_code, g.address,
       g.notes, true,
       g.nic_front_url, g.nic_back_url, g.photo_url, g.utility_bill_url,
       COALESCE(g.created_at, NOW()), COALESCE(g.updated_at, NOW())
FROM guarantors g
WHERE g.nic IS NULL;

UPDATE guarantors g SET contact_id = co.id
FROM contacts co
WHERE g.nic IS NOT NULL AND g.nic = co.nic;

UPDATE guarantors g SET contact_id = co.id
FROM contacts co
WHERE g.contact_id IS NULL
  AND g.name = co.name
  AND g.phone IS NOT DISTINCT FROM co.phone;

UPDATE guarantors g SET contact_id = co.id
FROM contacts co
WHERE g.contact_id IS NULL
  AND g.name = co.name
  AND NOT EXISTS (
    SELECT 1 FROM guarantors g2
    WHERE g2.name = co.name AND g2.id <> g.id AND g2.contact_id = co.id
  );

-- 6. Drop shared columns from role tables
ALTER TABLE customers
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS nic,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS phone2,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS street_address,
  DROP COLUMN IF EXISTS street_address_2,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS nic_front_url,
  DROP COLUMN IF EXISTS nic_back_url,
  DROP COLUMN IF EXISTS photo_url,
  DROP COLUMN IF EXISTS utility_bill_url,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE suppliers
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS phone2,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS nic,
  DROP COLUMN IF EXISTS street_address,
  DROP COLUMN IF EXISTS street_address_2,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS nic_front_url,
  DROP COLUMN IF EXISTS nic_back_url,
  DROP COLUMN IF EXISTS photo_url,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE guarantors
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS nic,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS phone2,
  DROP COLUMN IF EXISTS street_address,
  DROP COLUMN IF EXISTS street_address_2,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS nic_front_url,
  DROP COLUMN IF EXISTS nic_back_url,
  DROP COLUMN IF EXISTS photo_url,
  DROP COLUMN IF EXISTS utility_bill_url;

-- 7. RLS for contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon" ON contacts FOR ALL TO anon USING (false);
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO anon, authenticated, service_role;
