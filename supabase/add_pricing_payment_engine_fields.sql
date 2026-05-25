-- Pricing & Payment Engine field additions
alter table rentals add column if not exists applied_rate numeric(12,2);
alter table rentals add column if not exists rental_duration integer;
alter table rentals add column if not exists advance_paid numeric(12,2) default 0;
alter table rentals add column if not exists security_deposit_amount numeric(12,2) default 0;
alter table rentals add column if not exists is_deposit_collected boolean default false;
alter table rentals add column if not exists km_limit integer default 0;
alter table rentals add column if not exists extra_km_rate numeric(12,2) default 0;
alter table rentals add column if not exists extra_day_rate numeric(12,2) default 0;
alter table rentals add column if not exists refund_amount_due numeric(12,2) default 0;

-- allow ledger settlement states
alter table rentals drop constraint if exists rentals_payment_status_check;
alter table rentals
  add constraint rentals_payment_status_check
  check (payment_status in ('pending', 'partial', 'paid', 'balance_due', 'refund_pending'));

-- backfill using existing values
update rentals
set
  applied_rate = coalesce(applied_rate, daily_rate),
  rental_duration = coalesce(rental_duration, greatest(1, end_date - start_date)),
  advance_paid = coalesce(advance_paid, amount_paid, 0),
  security_deposit_amount = coalesce(security_deposit_amount, deposit, 0),
  is_deposit_collected = coalesce(is_deposit_collected, case when status = 'active' then true else false end),
  km_limit = coalesce(km_limit, 0),
  extra_km_rate = coalesce(extra_km_rate, 0),
  extra_day_rate = coalesce(extra_day_rate, daily_rate, 0),
  refund_amount_due = coalesce(refund_amount_due, 0);
