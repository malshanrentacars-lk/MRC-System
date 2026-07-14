-- Create signed_agreements table to track uploaded signed agreement files per rental
create table if not exists signed_agreements (
  id uuid default gen_random_uuid() primary key,
  rental_id uuid not null references rentals(id) on delete cascade,
  file_name text not null,
  storage_url text not null,
  storage_path text not null,
  uploaded_at timestamptz default now(),
  created_by uuid
);

-- Optional index for faster lookup by rental
create index if not exists idx_signed_agreements_rental_id on signed_agreements(rental_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON signed_agreements TO anon, authenticated, service_role;
