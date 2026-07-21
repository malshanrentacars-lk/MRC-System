'use server';

import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { RENTALS_TAG } from '@/lib/cache-tags';

export interface DepositEntry {
  id: string;
  rental_number: string;
  status: string;
  deposit: number;
  updated_at: string;
  customer: { name: string; phone?: string } | null;
  vehicle: { reg_number: string; brand: string; model: string } | null;
}

async function _fetchRefundableDeposits(params?: { page?: number; pageSize?: number }) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;

  const { data, error, count } = await supabaseAdmin
    .from('rentals')
    .select(
      'id, rental_number, status, deposit, updated_at, customer:customers(name, phone), vehicle:vehicles(reg_number, brand, model)',
      { count: 'exact' }
    )
    .gt('deposit', 0)
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) throw new Error(error.message);

  return {
    data: ((data ?? []) as unknown) as DepositEntry[],
    count: count ?? 0,
  };
}

const _cachedGetRefundableDeposits = unstable_cache(
  _fetchRefundableDeposits,
  ['refundable-deposits'],
  { tags: [RENTALS_TAG], revalidate: false },
);

export async function getRefundableDeposits(params?: { page?: number; pageSize?: number }) {
  await requireAuth();
  return _cachedGetRefundableDeposits(params);
}

async function _fetchTotalDeposit() {
  const { data } = await supabaseAdmin
    .from('rentals')
    .select('deposit')
    .in('status', ['active', 'booked'])
    .gt('deposit', 0);

  return (data ?? []).reduce((sum, r) => sum + (r.deposit ?? 0), 0);
}

const _cachedGetTotalDeposit = unstable_cache(
  _fetchTotalDeposit,
  ['total-deposit'],
  { tags: [RENTALS_TAG], revalidate: false },
);

export async function getTotalDeposit(): Promise<number> {
  await requireAuth();
  return _cachedGetTotalDeposit();
}
