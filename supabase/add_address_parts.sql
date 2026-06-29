alter table if exists company_settings
  add column if not exists street_address text,
  add column if not exists street_address_2 text,
  add column if not exists city text,
  add column if not exists postal_code text;

alter table if exists companies
  add column if not exists street_address text,
  add column if not exists street_address_2 text,
  add column if not exists city text,
  add column if not exists postal_code text;

alter table if exists customers
  add column if not exists street_address text,
  add column if not exists street_address_2 text,
  add column if not exists city text,
  add column if not exists postal_code text;

alter table if exists suppliers
  add column if not exists street_address text,
  add column if not exists street_address_2 text,
  add column if not exists city text,
  add column if not exists postal_code text;

alter table if exists guarantors
  add column if not exists street_address text,
  add column if not exists street_address_2 text,
  add column if not exists city text,
  add column if not exists postal_code text;