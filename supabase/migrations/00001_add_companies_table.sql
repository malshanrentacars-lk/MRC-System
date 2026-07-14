-- Create companies table to store company records
create table if not exists companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  email text,
  street_address text,
  street_address_2 text,
  city text,
  postal_code text,
  address text,
  notes text,
  logo_url text,
  logo_path text,
  is_active boolean default true,
  created_at timestamptz default now(),
  created_by uuid
);

create index if not exists idx_companies_name on companies(name);

grant select, insert, update, delete on companies to anon, authenticated, service_role;
