CREATE TABLE IF NOT EXISTS agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rental', 'supplier')),
  content TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active template per type
CREATE UNIQUE INDEX IF NOT EXISTS uq_agreement_template_active ON agreement_templates (type) WHERE is_active = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trg_agreement_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_agreement_templates_updated_at') THEN
    CREATE TRIGGER trg_agreement_templates_updated_at
      BEFORE UPDATE ON agreement_templates
      FOR EACH ROW EXECUTE FUNCTION trg_agreement_templates_updated_at();
  END IF;
END;
$$;

-- Seed default rental agreement template
INSERT INTO agreement_templates (id, name, type, content, is_active)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'Default Rental Agreement',
  'rental',
  '<div class="min-h-screen bg-white p-8 max-w-3xl mx-auto">
  <style>@media print { .no-print { display: none !important; } @page { margin: 1cm; } }</style>
  <div class="border-b-2 border-gray-900 pb-6 mb-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{company_name}</h1>
        <p class="text-sm text-gray-600 mt-1">{company_address}</p>
        <p class="text-sm text-gray-600">{company_phone}</p>
      </div>
      <div class="text-right">
        <h2 class="text-lg font-bold text-gray-900 uppercase">Rental Agreement</h2>
        <p class="text-gray-600 text-sm mt-1">#{rental_number}</p>
        <p class="text-gray-600 text-sm">Date: {printed_date}</p>
      </div>
    </div>
  </div>

  <div class="mb-6">
    <h3 class="font-semibold text-gray-900 mb-3 text-lg">Customer Details</h3>
    <table class="w-full text-sm border border-gray-200">
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium w-40">Full Name</td><td class="px-4 py-2">{customer_name}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">NIC</td><td class="px-4 py-2">{customer_nic}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Phone</td><td class="px-4 py-2">{customer_phone}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Email</td><td class="px-4 py-2">{customer_email}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Address</td><td class="px-4 py-2">{customer_address}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">License No.</td><td class="px-4 py-2">{customer_license}</td></tr>
    </table>
  </div>

  <div class="mb-6">
    <h3 class="font-semibold text-gray-900 mb-3 text-lg">Guarantor Details</h3>
    <table class="w-full text-sm border border-gray-200">
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium w-40">Full Name</td><td class="px-4 py-2">{guarantor_name}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">NIC</td><td class="px-4 py-2">{guarantor_nic}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Phone</td><td class="px-4 py-2">{guarantor_phone}</td></tr>
      <tr><td class="px-4 py-2 bg-gray-50 font-medium">Address</td><td class="px-4 py-2">{guarantor_address}</td></tr>
    </table>
  </div>

  <div class="mb-6">
    <h3 class="font-semibold text-gray-900 mb-3 text-lg">Vehicle Details</h3>
    <table class="w-full text-sm border border-gray-200">
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium w-40">Registration No.</td><td class="px-4 py-2 font-bold">{vehicle_reg}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Brand / Model</td><td class="px-4 py-2">{vehicle_brand} {vehicle_model}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Year</td><td class="px-4 py-2">{vehicle_year}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Pickup KM</td><td class="px-4 py-2">{pickup_km}</td></tr>
      <tr><td class="px-4 py-2 bg-gray-50 font-medium">Return KM</td><td class="px-4 py-2">{return_km}</td></tr>
    </table>
  </div>

  <div class="mb-6">
    <h3 class="font-semibold text-gray-900 mb-3 text-lg">Rental Period & Charges</h3>
    <table class="w-full text-sm border border-gray-200">
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium w-40">Start Date</td><td class="px-4 py-2">{start_date}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Return Date</td><td class="px-4 py-2">{end_date}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Total Days</td><td class="px-4 py-2">{total_days} days</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Daily Rate</td><td class="px-4 py-2">{daily_rate}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Additional Charges</td><td class="px-4 py-2">{additional_charges}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Discount</td><td class="px-4 py-2">{discount}</td></tr>
      <tr class="border-b bg-blue-50"><td class="px-4 py-2 font-bold">TOTAL AMOUNT</td><td class="px-4 py-2 font-bold text-blue-700 text-base">{total_amount}</td></tr>
      <tr><td class="px-4 py-2 bg-gray-50 font-medium">Deposit Paid</td><td class="px-4 py-2">{deposit}</td></tr>
    </table>
  </div>

  {notes_section}

  <div class="mt-10 grid grid-cols-3 gap-8 pt-4">
    <div class="text-center"><div class="border-t border-gray-300 pt-2"><p class="text-xs text-gray-500">Customer Signature</p></div></div>
    <div class="text-center"><div class="border-t border-gray-300 pt-2"><p class="text-xs text-gray-500">Guarantor Signature</p></div></div>
    <div class="text-center"><div class="border-t border-gray-300 pt-2"><p class="text-xs text-gray-500">Authorized Signature</p></div></div>
  </div>

  <div class="mt-8 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
    This is a system-generated document. {company_name} — All rights reserved.
  </div>
</div>',
  true
) ON CONFLICT (id) DO NOTHING;

-- Seed default supplier agreement template
INSERT INTO agreement_templates (id, name, type, content, is_active)
VALUES (
  'f0000000-0000-0000-0000-000000000002',
  'Default Supplier Agreement',
  'supplier',
  '<div class="min-h-screen bg-white p-8 max-w-3xl mx-auto">
  <style>@media print { .no-print { display: none !important; } @page { margin: 1cm; } }</style>
  <div class="border-b-2 border-gray-900 pb-6 mb-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{company_name}</h1>
        <p class="text-sm text-gray-600 mt-1">{company_address}</p>
        <p class="text-sm text-gray-600">{company_phone}</p>
      </div>
      <div class="text-right">
        <h2 class="text-lg font-bold text-gray-900 uppercase">Supplier Agreement</h2>
        <p class="text-gray-600 text-sm mt-1">Date: {printed_date}</p>
      </div>
    </div>
  </div>

  <div class="mb-6">
    <h3 class="font-semibold text-gray-900 mb-3 text-lg">Supplier Details</h3>
    <table class="w-full text-sm border border-gray-200">
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium w-40">Name</td><td class="px-4 py-2 font-bold">{supplier_name}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Phone</td><td class="px-4 py-2">{supplier_phone}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Email</td><td class="px-4 py-2">{supplier_email}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">NIC</td><td class="px-4 py-2">{supplier_nic}</td></tr>
      <tr><td class="px-4 py-2 bg-gray-50 font-medium">Address</td><td class="px-4 py-2">{supplier_address}</td></tr>
    </table>
  </div>

  <div class="mb-6">
    <h3 class="font-semibold text-gray-900 mb-3 text-lg">Vehicle Details</h3>
    <table class="w-full text-sm border border-gray-200">
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium w-40">Registration No.</td><td class="px-4 py-2 font-bold">{vehicle_reg}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Brand / Model</td><td class="px-4 py-2">{vehicle_brand} {vehicle_model}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Year</td><td class="px-4 py-2">{vehicle_year}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Fuel Type</td><td class="px-4 py-2">{vehicle_fuel_type}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Transmission</td><td class="px-4 py-2">{vehicle_transmission}</td></tr>
      <tr><td class="px-4 py-2 bg-gray-50 font-medium">Current KM</td><td class="px-4 py-2">{vehicle_km}</td></tr>
    </table>
  </div>

  <div class="mb-6">
    <h3 class="font-semibold text-gray-900 mb-3 text-lg">Agreement Terms</h3>
    <table class="w-full text-sm border border-gray-200">
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium w-40">Start Date</td><td class="px-4 py-2">{agreement_start_date}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Period</td><td class="px-4 py-2">{agreement_period} Months</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Renew Date</td><td class="px-4 py-2">{renew_date}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Monthly Cost</td><td class="px-4 py-2 font-bold">{monthly_cost}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Payment Frequency</td><td class="px-4 py-2">{payment_frequency}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Payment Days</td><td class="px-4 py-2">{payment_days}</td></tr>
      <tr><td class="px-4 py-2 bg-gray-50 font-medium">Payment Type</td><td class="px-4 py-2">{payment_type}</td></tr>
    </table>
  </div>

  <div class="mb-6">
    <h3 class="font-semibold text-gray-900 mb-3 text-lg">Supplier Bank Details</h3>
    <table class="w-full text-sm border border-gray-200">
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium w-40">Bank</td><td class="px-4 py-2">{supplier_bank}</td></tr>
      <tr class="border-b"><td class="px-4 py-2 bg-gray-50 font-medium">Account Number</td><td class="px-4 py-2">{supplier_account_number}</td></tr>
      <tr><td class="px-4 py-2 bg-gray-50 font-medium">Branch</td><td class="px-4 py-2">{supplier_branch}</td></tr>
    </table>
  </div>

  {notes_section}

  <div class="mt-10 grid grid-cols-2 gap-8 pt-4">
    <div class="text-center"><div class="border-t border-gray-300 pt-2"><p class="text-xs text-gray-500">Supplier Signature</p></div></div>
    <div class="text-center"><div class="border-t border-gray-300 pt-2"><p class="text-xs text-gray-500">Company Representative</p></div></div>
  </div>

  <div class="mt-8 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
    This is a system-generated document. {company_name} — All rights reserved.
  </div>
</div>',
  true
) ON CONFLICT (id) DO NOTHING;
