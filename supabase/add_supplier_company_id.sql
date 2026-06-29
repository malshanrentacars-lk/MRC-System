-- Add company reference to suppliers
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
