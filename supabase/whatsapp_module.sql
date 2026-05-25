-- WhatsApp module tables (Supabase)

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  message text not null,
  is_active boolean not null default true,
  channel text not null default 'both' check (channel in ('whatsapp', 'email', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_message_logs (
  id uuid primary key default gen_random_uuid(),
  customer text not null,
  channel text not null check (channel in ('whatsapp', 'email', 'both')),
  message text not null,
  status text not null check (status in ('Sent', 'Delivered', 'Failed', 'Read')),
  created_at timestamptz not null default now()
);

create or replace function public.set_whatsapp_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_templates_updated_at on public.whatsapp_templates;
create trigger trg_whatsapp_templates_updated_at
before update on public.whatsapp_templates
for each row
execute function public.set_whatsapp_templates_updated_at();

insert into public.whatsapp_templates (name, type, message, is_active, channel)
select 'Birthday Wish', 'Birthday Wish', 'Happy Birthday {customerFirstName}! Wishing you a wonderful day from {companyName}.', true, 'both'
where not exists (select 1 from public.whatsapp_templates where type = 'Birthday Wish');

insert into public.whatsapp_templates (name, type, message, is_active, channel)
select 'Due Date Reminder', 'Due Date Reminder', 'Hi {customerName}, your rental ({vehicleName} - {vehicleRegNo}) is due on {returnDate}.', true, 'both'
where not exists (select 1 from public.whatsapp_templates where type = 'Due Date Reminder');

insert into public.whatsapp_templates (name, type, message, is_active, channel)
select 'Promotional Message', 'Promotional Message', 'Special offer from {companyName}! Contact us at {companyPhone} to claim your deal.', true, 'both'
where not exists (select 1 from public.whatsapp_templates where type = 'Promotional Message');

insert into public.whatsapp_templates (name, type, message, is_active, channel)
select 'Rental Completed', 'Rental Completed', 'Thank you {customerName} for completing rental {rentalNumber}. Total amount: {totalAmount}.', true, 'both'
where not exists (select 1 from public.whatsapp_templates where type = 'Rental Completed');

insert into public.whatsapp_templates (name, type, message, is_active, channel)
select 'Rental Reservation', 'Rental Reservation', 'Your reservation for {vehicleName} ({vehicleRegNo}) is confirmed from {pickupDate} to {returnDate}.', true, 'both'
where not exists (select 1 from public.whatsapp_templates where type = 'Rental Reservation');
