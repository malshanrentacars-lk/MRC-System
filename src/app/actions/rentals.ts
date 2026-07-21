'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { deleteOldStorageFile, uploadAsset } from '@/app/actions/upload';
import { logActivity } from '@/app/actions/activity';
import { Rental } from '@/types';
import { DASHBOARD_TAG, VEHICLES_TAG, RENTALS_TAG } from '@/lib/cache-tags';

const SIGNED_AGREEMENTS_BUCKET = 'signed-agreements';
const SIGNED_AGREEMENT_NOTE_TAG = '[SIGNED_AGREEMENT]';

type RateType = 'daily' | 'hourly' | 'weekly';
type SettlementStatus = 'balance_due' | 'paid' | 'refund_pending';

function daysBetween(startDate: string, endDate: string) {
  const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(diff / 86400000));
}

function calculateRentalDuration(startDate: string, endDate: string, rateType: RateType) {
  const days = daysBetween(startDate, endDate);
  if (rateType === 'weekly') return Math.max(1, Math.ceil(days / 7));
  if (rateType === 'hourly') return Math.max(1, days * 24);
  return days;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function computeSettlement(finalAmount: number, advancePaid: number, securityDepositApplied: number) {
  const netBalance = roundMoney(finalAmount - (advancePaid + securityDepositApplied));
  const refundDue = netBalance < 0 ? Math.abs(netBalance) : 0;
  const status: SettlementStatus = netBalance > 0 ? 'balance_due' : netBalance === 0 ? 'paid' : 'refund_pending';
  return { netBalance, refundDue, status };
}

function toLegacyPaymentStatus(status: SettlementStatus, advancePaid: number) {
  if (status === 'paid' || status === 'refund_pending') return 'paid';
  return advancePaid > 0 ? 'partial' : 'pending';
}

function extractSignedAgreementFromNotes(notes?: string | null): { url: string; path: string } | null {
  if (!notes) return null;
  const line = notes
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith(SIGNED_AGREEMENT_NOTE_TAG));
  if (!line) return null;
  const raw = line.slice(SIGNED_AGREEMENT_NOTE_TAG.length).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { url?: string; path?: string };
    if (!parsed.url || !parsed.path) return null;
    return { url: parsed.url, path: parsed.path };
  } catch {
    return null;
  }
}

function upsertSignedAgreementInNotes(notes: string | null | undefined, url: string, path: string) {
  const safeNotes = (notes ?? '').trim();
  const cleaned = safeNotes
    .split('\n')
    .filter((l) => !l.trim().startsWith(SIGNED_AGREEMENT_NOTE_TAG))
    .join('\n')
    .trim();
  const marker = `${SIGNED_AGREEMENT_NOTE_TAG} ${JSON.stringify({ url, path })}`;
  return cleaned ? `${cleaned}\n${marker}` : marker;
}

function removeSignedAgreementFromNotes(notes: string | null | undefined) {
  const safeNotes = (notes ?? '').trim();
  const cleaned = safeNotes
    .split('\n')
    .filter((l) => !l.trim().startsWith(SIGNED_AGREEMENT_NOTE_TAG))
    .join('\n')
    .trim();
  return cleaned || null;
}

async function _fetchRentals(params?: {
  search?: string;
  status?: string;
  vehicleReg?: string;
  vehicleId?: string;
  customerId?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = supabaseAdmin
    .from('rentals')
    .select(
      `*, 
      vehicle:vehicles(id, reg_number, brand, model, type),
      customer:customers(id, name, phone),
      guarantor:guarantors(id, name, phone)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (params?.search) query = query.ilike('rental_number', `%${params.search}%`);
  if (params?.status && params.status !== 'all') query = query.eq('status', params.status);
  if (params?.customerId) query = query.eq('customer_id', params.customerId);
  if (params?.paymentStatus) query = query.eq('payment_status', params.paymentStatus);
  if (params?.vehicleId) {
    query = query.eq('vehicle_id', params.vehicleId);
  } else if (params?.vehicleReg) {
    const { data: v } = await supabaseAdmin.from('vehicles').select('id').ilike('reg_number', `%${params.vehicleReg}%`);
    const ids = (v ?? []).map(x => x.id);
    if (ids.length > 0) query = query.in('vehicle_id', ids);
  }
  if (params?.dateFrom) query = query.gte('start_date', params.dateFrom);
  if (params?.dateTo) query = query.lte('end_date', params.dateTo);

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data: (data ?? []) as Rental[], count: count ?? 0 };
}

const _cachedGetRentals = unstable_cache(
  _fetchRentals,
  ['rentals-list'],
  { tags: [RENTALS_TAG], revalidate: false },
);

export async function getRentals(params?: {
  search?: string;
  status?: string;
  vehicleReg?: string;
  vehicleId?: string;
  customerId?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();
  return _cachedGetRentals(params);
}

async function _fetchRentalById(id: string): Promise<Rental | null> {
  const baseQuery = `
      *,
      vehicle:vehicles(*, supplier:suppliers(id, name)),
      customer:customers(*),
      guarantor:guarantors(*),
      exchanges:vehicle_exchanges(*, old_vehicle:vehicles!vehicle_exchanges_old_vehicle_id_fkey(id, reg_number, brand, model), new_vehicle:vehicles!vehicle_exchanges_new_vehicle_id_fkey(id, reg_number, brand, model))
    `;

  let { data, error } = await supabaseAdmin
    .from('rentals')
    .select(baseQuery)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  if (!data.signed_agreement_url || !data.signed_agreement_path) {
    const fromNotes = extractSignedAgreementFromNotes(data.notes);
    if (fromNotes) {
      data.signed_agreement_url = fromNotes.url;
      data.signed_agreement_path = fromNotes.path;
    }
  }
  return data as Rental;
}

const _cachedGetRentalById = unstable_cache(
  _fetchRentalById,
  ['rental-by-id'],
  { tags: [RENTALS_TAG], revalidate: false },
);

export async function getRentalById(id: string): Promise<Rental | null> {
  await requireAuth();
  return _cachedGetRentalById(id);
}

export async function checkVehicleOverlap(
  vehicleId: string,
  startDate: string,
  endDate: string,
  excludeRentalId?: string
): Promise<boolean> {
  await requireAuth();

  let query = supabaseAdmin
    .from('rentals')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .in('status', ['active', 'booked'])
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (excludeRentalId) query = query.neq('id', excludeRentalId);

  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

export async function getVehicleBookedRanges(vehicleId: string): Promise<{ start_date: string; end_date: string; status: string }[]> {
  await requireAuth();
  const { data: rentals } = await supabaseAdmin
    .from('rentals')
    .select('start_date, end_date, status')
    .eq('vehicle_id', vehicleId)
    .in('status', ['active', 'booked'])
    .order('start_date', { ascending: true });

  return (rentals ?? []) as { start_date: string; end_date: string; status: string }[];
}

export async function getBookedDates(vehicleId: string): Promise<Date[]> {
  await requireAuth();
  const { data: rentals } = await supabaseAdmin
    .from('rentals')
    .select('start_date, end_date')
    .eq('vehicle_id', vehicleId)
    .in('status', ['active', 'booked']);

  if (!rentals?.length) return [];

  const booked: Date[] = [];
  for (const r of rentals as { start_date: string; end_date: string }[]) {
    const start = new Date(r.start_date + 'T12:00:00');
    const end = new Date(r.end_date + 'T12:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      booked.push(new Date(d));
    }
  }
  return booked;
}

export async function createRental(data: {
  vehicle_id: string;
  customer_id: string;
  guarantor_id?: string;
  start_date: string;
  end_date: string;
  daily_rate: number;
  deposit: number;
  applied_rate?: number;
  rental_duration?: number;
  rate_type?: RateType;
  advance_paid?: number;
  security_deposit_amount?: number;
  is_deposit_collected?: boolean;
  km_limit?: number;
  extra_km_rate?: number;
  extra_day_rate?: number;
  additional_charges?: number;
  discount?: number;
  pickup_km?: number;
  notes?: string;
  status?: 'booked' | 'active';
}) {
  const session = await requireAuth();

  // Check overlap
  const overlaps = await checkVehicleOverlap(data.vehicle_id, data.start_date, data.end_date);
  if (overlaps) return { error: 'Vehicle is already booked for the selected dates.' };

  if (!data.guarantor_id) return { error: 'Guarantor is required.' };

  const rateType = data.rate_type ?? 'daily';
  const appliedRate = Number(data.applied_rate ?? data.daily_rate ?? 0);
  const rentalDuration = Number(data.rental_duration ?? calculateRentalDuration(data.start_date, data.end_date, rateType));
  const subtotal = roundMoney(appliedRate * rentalDuration);
  const additional = data.additional_charges ?? 0;
  const discount = data.discount ?? 0;
  const total_amount = roundMoney(subtotal + additional - discount);
  const securityDepositAmount = roundMoney(data.security_deposit_amount ?? data.deposit ?? 0);
  const advancePaid = roundMoney(data.advance_paid ?? 0);
  const isDepositCollected = data.is_deposit_collected ?? (data.status === 'active');
  const settlement = computeSettlement(total_amount, advancePaid, isDepositCollected ? securityDepositAmount : 0);
  const paymentStatus = settlement.status;
  const legacyPaymentStatus = toLegacyPaymentStatus(settlement.status, advancePaid);

  const richInsertPayload = {
    vehicle_id: data.vehicle_id,
    customer_id: data.customer_id,
    guarantor_id: data.guarantor_id ?? null,
    created_by: session.id,
    start_date: data.start_date,
    end_date: data.end_date,
    daily_rate: appliedRate,
    subtotal,
    additional_charges: additional,
    discount,
    total_amount,
    deposit: securityDepositAmount,
    pickup_km: data.pickup_km ?? 0,
    status: data.status ?? 'booked',
    rental_number: '',
    notes: data.notes ?? null,
    payment_status: paymentStatus,
    applied_rate: appliedRate,
    rental_duration: rentalDuration,
    amount_paid: advancePaid,
    security_deposit_amount: securityDepositAmount,
    is_deposit_collected: isDepositCollected,
    km_limit: data.km_limit ?? 0,
    extra_km_rate: data.extra_km_rate ?? 0,
    extra_day_rate: data.extra_day_rate ?? appliedRate,
    refund_amount_due: settlement.refundDue,
  };

  const legacyInsertPayload = {
    vehicle_id: data.vehicle_id,
    customer_id: data.customer_id,
    guarantor_id: data.guarantor_id ?? null,
    created_by: session.id,
    start_date: data.start_date,
    end_date: data.end_date,
    daily_rate: appliedRate,
    subtotal,
    additional_charges: additional,
    discount,
    total_amount,
    deposit: securityDepositAmount,
    pickup_km: data.pickup_km ?? 0,
    status: data.status ?? 'booked',
    rental_number: '',
    notes: data.notes ?? null,
    payment_status: legacyPaymentStatus,
    amount_paid: advancePaid,
  };

  let { data: rental, error } = await supabaseAdmin
    .from('rentals')
    .insert(richInsertPayload)
    .select()
    .single();

  if (error) {
    const fallback = await supabaseAdmin
      .from('rentals')
      .insert(legacyInsertPayload)
      .select()
      .single();
    rental = fallback.data;
    error = fallback.error;
  }

  if (error) return { error: error.message };

  // Update vehicle status
  await supabaseAdmin.from('vehicles').update({
    status: data.status === 'active' ? 'rented' : 'booked',
  }).eq('id', data.vehicle_id);

  revalidatePath('/rentals');
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);
  revalidateTag(VEHICLES_TAG);
  await logActivity({
    action: 'created',
    module: 'Rentals',
    entity_id: rental.id,
    entity_label: rental.rental_number || `Rental #${rental.id.slice(0,8)}`,
    details: `Status: ${rental.status}`,
  });
  return { data: rental };
}

export async function activateRental(rentalId: string, pickupKm: number) {
  await requireAuth();

  const { data: rental } = await supabaseAdmin.from('rentals').select('vehicle_id, rental_number').eq('id', rentalId).single();
  if (!rental) return { error: 'Rental not found' };

  let { error: updateError } = await supabaseAdmin
    .from('rentals')
    .update({ status: 'active', pickup_km: pickupKm, is_deposit_collected: true })
    .eq('id', rentalId);
  if (updateError) {
    await supabaseAdmin.from('rentals').update({ status: 'active', pickup_km: pickupKm }).eq('id', rentalId);
  }
  await supabaseAdmin.from('vehicles').update({ status: 'rented', current_km: pickupKm }).eq('id', rental.vehicle_id);

  revalidatePath('/rentals');
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);
  revalidateTag(VEHICLES_TAG);
  await logActivity({
    action: 'activated',
    module: 'Rentals',
    entity_id: rentalId,
    entity_label: rental.rental_number,
    details: `Pickup KM: ${pickupKm}`,
  });
  return { success: true };
}

export async function returnRental(rentalId: string, data: {
  return_km: number;
  actual_return_date: string;
  additional_charges?: number;
  km_limit?: number;
  extra_km_rate?: number;
  extra_day_rate?: number;
  return_notes?: string;
}) {
  await requireAuth();

  type ReturnRentalRecord = {
    vehicle_id: string;
    rental_number: string;
    start_date: string;
    end_date: string;
    pickup_km?: number | null;
    daily_rate?: number | null;
    subtotal?: number | null;
    additional_charges?: number | null;
    discount?: number | null;
    applied_rate?: number | null;
    rental_duration?: number | null;
    advance_paid?: number | null;
    amount_paid?: number | null;
    security_deposit_amount?: number | null;
    is_deposit_collected?: boolean | null;
    km_limit?: number | null;
    extra_km_rate?: number | null;
    extra_day_rate?: number | null;
    deposit?: number | null;
  };

  let { data: rental, error: rentalError } = await supabaseAdmin
    .from('rentals')
    .select('vehicle_id, rental_number, start_date, end_date, pickup_km, daily_rate, subtotal, additional_charges, discount, applied_rate, rental_duration, amount_paid, security_deposit_amount, is_deposit_collected, km_limit, extra_km_rate, extra_day_rate')
    .eq('id', rentalId)
    .single();
  let rentalRecord = rental as ReturnRentalRecord | null;
  let hasRichColumns = true;

  if (rentalError || !rentalRecord) {
    hasRichColumns = false;
    const fallback = await supabaseAdmin
      .from('rentals')
      .select('vehicle_id, rental_number, start_date, end_date, pickup_km, daily_rate, subtotal, additional_charges, discount, deposit, amount_paid')
      .eq('id', rentalId)
      .single();
    rentalRecord = fallback.data as ReturnRentalRecord | null;
    rentalError = fallback.error;
  }

  if (rentalError || !rentalRecord) return { error: 'Rental not found' };

  const pickupKm = Number(rentalRecord.pickup_km ?? 0);
  const distanceCovered = Math.max(0, Number(data.return_km) - pickupKm);
  const kmLimit = Number(data.km_limit ?? rentalRecord.km_limit ?? 0);
  const extraKmRate = Number(data.extra_km_rate ?? rentalRecord.extra_km_rate ?? 0);
  const extraDayRate = Number(data.extra_day_rate ?? rentalRecord.extra_day_rate ?? rentalRecord.daily_rate ?? 0);
  const expectedReturn = new Date(rentalRecord.end_date);
  const actualReturn = new Date(data.actual_return_date);
  const lateMs = actualReturn.getTime() - expectedReturn.getTime();
  const lateDays = Math.max(0, Math.ceil(lateMs / 86400000));

  const extraKmFee = roundMoney(Math.max(0, distanceCovered - kmLimit) * extraKmRate);
  const extraDayFee = roundMoney(lateDays * extraDayRate);
  const manualExtra = roundMoney(data.additional_charges ?? 0);
  const updatedAdditional = roundMoney(Number(rentalRecord.additional_charges ?? 0) + manualExtra + extraKmFee + extraDayFee);

  const baseAmount = roundMoney(Number(rentalRecord.subtotal ?? (Number(rentalRecord.applied_rate ?? rentalRecord.daily_rate ?? 0) * Number(rentalRecord.rental_duration ?? daysBetween(rentalRecord.start_date, rentalRecord.end_date)))));
  const discount = roundMoney(Number(rentalRecord.discount ?? 0));
  const finalAmount = roundMoney(baseAmount + updatedAdditional - discount);

  const advancePaid = roundMoney(Number(rentalRecord.advance_paid ?? rentalRecord.amount_paid ?? 0));
  const securityDepositAmount = roundMoney(Number(rentalRecord.security_deposit_amount ?? rentalRecord.deposit ?? 0));
  const securityDepositApplied = rentalRecord.is_deposit_collected === false ? 0 : securityDepositAmount;
  const settlement = computeSettlement(finalAmount, advancePaid, securityDepositApplied);
  const paymentStatus = settlement.status;
  const legacyPaymentStatus = toLegacyPaymentStatus(settlement.status, advancePaid);

  const richUpdatePayload = {
    status: 'returned',
    return_km: data.return_km,
    actual_return_date: data.actual_return_date,
    additional_charges: updatedAdditional,
    total_amount: finalAmount,
    return_notes: data.return_notes ?? null,
    km_limit: kmLimit,
    extra_km_rate: extraKmRate,
    extra_day_rate: extraDayRate,
    refund_amount_due: settlement.refundDue,
    payment_status: paymentStatus,
  };

  const legacyUpdatePayload = {
    status: 'returned',
    return_km: data.return_km,
    actual_return_date: data.actual_return_date,
    additional_charges: updatedAdditional,
    total_amount: finalAmount,
    return_notes: data.return_notes ?? null,
    payment_status: legacyPaymentStatus,
  };

  let { error: updateError } = await supabaseAdmin.from('rentals').update(richUpdatePayload).eq('id', rentalId);
  if (updateError) {
    hasRichColumns = false;
    const fallbackUpdate = await supabaseAdmin.from('rentals').update(legacyUpdatePayload).eq('id', rentalId);
    updateError = fallbackUpdate.error;
  }
  if (updateError) return { error: updateError.message };

  const { data: settings } = await supabaseAdmin.from('company_settings').select('service_interval_km').single();
  const interval = settings?.service_interval_km ?? 5000;

  await supabaseAdmin.from('vehicles').update({
    status: 'available',
    current_km: data.return_km,
    next_service_km: data.return_km + interval,
  }).eq('id', rentalRecord.vehicle_id);

  revalidatePath('/rentals');
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);
  revalidateTag(VEHICLES_TAG);
  await logActivity({
    action: 'returned',
    module: 'Rentals',
    entity_id: rentalId,
    entity_label: rentalRecord.rental_number,
    details: `Return KM: ${data.return_km} | Extra Day Fee: LKR ${extraDayFee.toFixed(2)} | Extra KM Fee: LKR ${extraKmFee.toFixed(2)} | Net: LKR ${settlement.netBalance.toFixed(2)}`,
  });
  return {
    success: true,
    final_amount: finalAmount,
    extra_day_fee: extraDayFee,
    extra_km_fee: extraKmFee,
    net_balance: settlement.netBalance,
    refund_due: settlement.refundDue,
    settlement_status: settlement.status,
    payment_status: hasRichColumns ? paymentStatus : legacyPaymentStatus,
  };
}

export async function exchangeVehicle(data: {
  rental_id: string;
  old_vehicle_id: string;
  new_vehicle_id: string;
  exchange_date: string;
  reason?: string;
  additional_charge?: number;
  old_vehicle_km?: number;
  new_vehicle_km?: number;
}) {
  const session = await requireAuth();

  // Check new vehicle availability
  const overlaps = await checkVehicleOverlap(data.new_vehicle_id, data.exchange_date, '2099-12-31', data.rental_id);
  if (overlaps) return { error: 'New vehicle is not available.' };

  await supabaseAdmin.from('vehicle_exchanges').insert({
    ...data,
    additional_charge: data.additional_charge ?? 0,
    approved_by: session.id,
  });

  // Update rental vehicle
  const addl = data.additional_charge ?? 0;
  await supabaseAdmin.from('rentals').update({
    vehicle_id: data.new_vehicle_id,
    additional_charges: addl,
  }).eq('id', data.rental_id);

  // Update vehicle statuses
  await supabaseAdmin.from('vehicles').update({ status: 'available' }).eq('id', data.old_vehicle_id);
  await supabaseAdmin.from('vehicles').update({ status: 'rented' }).eq('id', data.new_vehicle_id);

  // Fetch rental number for log
  const { data: r } = await supabaseAdmin.from('rentals').select('rental_number').eq('id', data.rental_id).single();

  revalidatePath('/rentals');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);
  revalidateTag(VEHICLES_TAG);
  await logActivity({
    action: 'exchanged',
    module: 'Rentals',
    entity_id: data.rental_id,
    entity_label: r?.rental_number ?? data.rental_id,
    details: `Vehicle exchanged${data.reason ? ': ' + data.reason : ''}`,
  });
  return { success: true };
}

export async function cancelRental(rentalId: string) {
  await requireAuth();

  const { data: rental } = await supabaseAdmin.from('rentals').select('vehicle_id, rental_number').eq('id', rentalId).single();
  if (!rental) return { error: 'Rental not found' };

  await supabaseAdmin.from('rentals').update({ status: 'cancelled' }).eq('id', rentalId);
  await supabaseAdmin.from('vehicles').update({ status: 'available' }).eq('id', rental.vehicle_id);

  revalidatePath('/rentals');
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);
  revalidateTag(VEHICLES_TAG);
  await logActivity({
    action: 'cancelled',
    module: 'Rentals',
    entity_id: rentalId,
    entity_label: rental.rental_number,
  });
  return { success: true };
}

export async function recordRentalPayment(rentalId: string, data: {
  amount: number;
  method: string;
  notes?: string;
}) {
  await requireAuth();

  type PaymentRentalRecord = { id: string; rental_number: string; total_amount?: number | null; payment_status?: string; advance_paid?: number | null; amount_paid?: number | null };
  let rental: PaymentRentalRecord | null = null;

  let rentalData: PaymentRentalRecord | null = null;
  let fetchError: any = null;

  const primary = await supabaseAdmin
    .from('rentals')
    .select('id, rental_number, total_amount, amount_paid, payment_status')
    .eq('id', rentalId)
    .single();
  rentalData = primary.data as PaymentRentalRecord | null;
  fetchError = primary.error;

  if (fetchError || !rentalData) {
    const retry = await supabaseAdmin
      .from('rentals')
      .select('id, rental_number, total_amount, payment_status, amount_paid')
      .eq('id', rentalId)
      .single();
    rentalData = retry.data as PaymentRentalRecord | null;
    fetchError = retry.error;
  }

  rental = rentalData ?? null;
  if (fetchError || !rental) return { error: 'Rental not found' };

  const currentPaid = Number(rental.amount_paid ?? rental.advance_paid ?? 0);
  const nextPaid = currentPaid + data.amount;
  const totalDue = Number(rental.total_amount ?? 0);
  const paymentStatus = nextPaid >= totalDue && totalDue > 0 ? 'paid' : nextPaid > 0 ? 'partial' : 'pending';

  const payload = {
    amount_paid: nextPaid,
    payment_status: paymentStatus,
    payment_method: data.method,
    payment_notes: data.notes ?? null,
    last_payment_date: new Date().toISOString().slice(0, 10),
  };

  const { error: updateError } = await supabaseAdmin.from('rentals').update(payload).eq('id', rentalId);
  if (updateError) return { error: updateError.message };

  revalidatePath('/rentals');
  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);
  revalidateTag(VEHICLES_TAG);

  await logActivity({
    action: 'updated',
    module: 'Rentals',
    entity_id: rentalId,
    entity_label: rental.rental_number,
    details: `Payment recorded: LKR ${data.amount.toFixed(2)} via ${data.method}`,
  });

  return { success: true, payment_status: paymentStatus, advance_paid: nextPaid };
}

export async function uploadSignedAgreement(rentalId: string, file: File) {
  await requireAuth();

  const fileName = file.name?.toLowerCase() ?? '';
  const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
  if (!isPdf) return { error: 'Only PDF files are allowed.' };
  if (file.size > 5 * 1024 * 1024) return { error: 'File size must be 5MB or less.' };

  const { data: baseRental, error: baseError } = await supabaseAdmin
    .from('rentals')
    .select('id, rental_number, notes, signed_agreement_url, signed_agreement_path')
    .eq('id', rentalId)
    .single();

  type AgreementRentalRecord = {
    id: string;
    rental_number: string;
    notes?: string | null;
    signed_agreement_url?: string | null;
    signed_agreement_path?: string | null;
  };

  const rentalRecord = baseRental as AgreementRentalRecord | null;
  if (baseError || !rentalRecord) return { error: 'Rental not found' };

  const currentAgreement = extractSignedAgreementFromNotes(rentalRecord.notes);
  const oldAgreementUrl = rentalRecord.signed_agreement_url ?? currentAgreement?.url ?? null;

  const upload = await uploadAsset(SIGNED_AGREEMENTS_BUCKET, rentalId, file);
  if ('error' in upload && upload.error) return { error: upload.error };

  const uploadUrl = upload.url ?? null;
  const uploadPath = upload.path ?? null;
  if (!uploadUrl || !uploadPath) return { error: 'Upload failed' };

  const nextNotes = upsertSignedAgreementInNotes(rentalRecord.notes, uploadUrl, uploadPath);
  const payload = {
    signed_agreement_url: uploadUrl,
    signed_agreement_path: uploadPath,
    notes: nextNotes,
  };

  const { error: updateError } = await supabaseAdmin.from('rentals').update(payload).eq('id', rentalId);
  if (updateError) {
    await deleteOldStorageFile(uploadUrl, null);
    return { error: updateError.message };
  }

  await deleteOldStorageFile(oldAgreementUrl, uploadUrl);

  revalidatePath('/rentals');
  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath('/agreements');
  revalidatePath(`/agreements/${rentalId}`);
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);

  await logActivity({
    action: 'uploaded',
    module: 'Rentals',
    entity_id: rentalId,
    entity_label: rentalRecord.rental_number,
    details: 'Signed agreement uploaded',
  });

  return { success: true, url: uploadUrl, path: uploadPath };
}

export async function restoreRentals(ids: string[]) {
  await requireAuth();
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No rentals specified' };

  const { error } = await supabaseAdmin.from('rentals').update({ status: 'booked' }).in('id', ids);
  if (error) return { error: error.message };

  revalidatePath('/rentals');
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);
  revalidateTag(VEHICLES_TAG);

  for (const id of ids) {
    await logActivity({ action: 'updated', module: 'Rentals', entity_id: id, entity_label: id, details: 'Rental restored' });
  }

  return { success: true };
}

export async function destroyRentals(ids: string[]) {
  await requireAuth();
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No rentals specified' };

  // Remove signed agreement files if present (best-effort)
  const { data } = await supabaseAdmin.from('rentals').select('id, signed_agreement_url').in('id', ids);
  const rows = data ?? [];
  for (const r of rows) {
    try {
      if (r.signed_agreement_url) await deleteOldStorageFile(r.signed_agreement_url, null);
    } catch { /* ignore */ }
  }

  const { error } = await supabaseAdmin.from('rentals').delete().in('id', ids);
  if (error) return { error: error.message };

  revalidatePath('/rentals');
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);

  for (const id of ids) {
    await logActivity({ action: 'deleted', module: 'Rentals', entity_id: id, entity_label: id });
  }

  return { success: true };
}

export async function removeSignedAgreement(rentalId: string) {
  await requireAuth();

  type AgreementRentalRecord = {
    id: string;
    rental_number: string;
    notes?: string | null;
    signed_agreement_url?: string | null;
    signed_agreement_path?: string | null;
  };

  const baseQuery = await supabaseAdmin
    .from('rentals')
    .select('id, rental_number, notes, signed_agreement_url, signed_agreement_path')
    .eq('id', rentalId)
    .single();

  const rental = baseQuery.data as AgreementRentalRecord | null;
  if (baseQuery.error || !rental) return { error: 'Rental not found' };

  const fromNotes = extractSignedAgreementFromNotes(rental.notes);
  const agreementUrl = rental.signed_agreement_url ?? fromNotes?.url ?? null;
  const agreementPath = rental.signed_agreement_path ?? fromNotes?.path ?? null;

  if (!agreementUrl || !agreementPath) return { error: 'Agreement not found' };

  try {
    await deleteOldStorageFile(agreementUrl, null);
  } catch {
    // continue
  }

  const nextNotes = removeSignedAgreementFromNotes(rental.notes);
  const payload = { signed_agreement_url: null, signed_agreement_path: null, notes: nextNotes };

  const { error: delError } = await supabaseAdmin.from('rentals').update(payload).eq('id', rentalId);
  if (delError) return { error: delError.message };

  revalidatePath('/rentals');
  revalidatePath(`/rentals/${rentalId}`);
  revalidatePath('/agreements');
  revalidatePath(`/agreements/${rentalId}`);
  revalidatePath('/dashboard');
  revalidateTag(RENTALS_TAG);
  revalidateTag(DASHBOARD_TAG);

  await logActivity({
    action: 'deleted',
    module: 'Rentals',
    entity_id: rentalId,
    entity_label: rental.rental_number,
    details: 'Signed agreement removed',
  });

  return { success: true };
}
