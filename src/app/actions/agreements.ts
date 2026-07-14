'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, requireAdmin, getSession } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatAddress } from '@/lib/address';
import { Rental, Vehicle, Supplier } from '@/types';

export interface AgreementTemplate {
  id: string;
  name: string;
  type: 'rental' | 'supplier';
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Template CRUD ─────────────────────────────────────────────────────────

export async function getTemplates(): Promise<AgreementTemplate[]> {
  await requireAuth();
  const { data } = await supabaseAdmin
    .from('agreement_templates')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  return (data ?? []) as AgreementTemplate[];
}

export async function getTemplateById(id: string): Promise<AgreementTemplate | null> {
  await requireAuth();
  const { data } = await supabaseAdmin
    .from('agreement_templates')
    .select('*')
    .eq('id', id)
    .single();
  return data as AgreementTemplate | null;
}

export async function createTemplate(formData: FormData) {
  await requireAdmin();
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const content = formData.get('content') as string;

  const { error } = await supabaseAdmin.from('agreement_templates').insert({
    name,
    type,
    content,
    is_active: true,
  });
  if (error) return { error: error.message };
  revalidatePath('/agreements');
  return { success: true };
}

export async function updateTemplate(id: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get('name') as string;
  const content = formData.get('content') as string;

  const { error } = await supabaseAdmin.from('agreement_templates').update({
    name,
    content,
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/agreements');
  return { success: true };
}

export async function deleteTemplate(id: string) {
  await requireAdmin();
  await supabaseAdmin.from('agreement_templates').delete().eq('id', id);
  revalidatePath('/agreements');
  return { success: true };
}

export async function setActiveTemplate(id: string, type: string) {
  await requireAdmin();
  // Deactivate all templates of this type
  await supabaseAdmin.from('agreement_templates').update({ is_active: false }).eq('type', type);
  // Activate the selected one
  await supabaseAdmin.from('agreement_templates').update({ is_active: true }).eq('id', id);
  revalidatePath('/agreements');
  return { success: true };
}

// ─── Placeholder Replacement ───────────────────────────────────────────────

interface RentalPlaceholders {
  rental_number: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  customer_name: string;
  customer_nic: string;
  customer_phone: string;
  customer_phone2: string;
  customer_email: string;
  customer_address: string;
  customer_license: string;
  guarantor_name: string;
  guarantor_nic: string;
  guarantor_phone: string;
  guarantor_address: string;
  vehicle_reg: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_fuel_type: string;
  vehicle_transmission: string;
  pickup_km: string;
  return_km: string;
  start_date: string;
  end_date: string;
  total_days: string;
  daily_rate: string;
  additional_charges: string;
  discount: string;
  total_amount: string;
  deposit: string;
  printed_date: string;
  notes_section: string;
}

interface SupplierPlaceholders {
  company_name: string;
  company_address: string;
  company_phone: string;
  supplier_name: string;
  supplier_phone: string;
  supplier_email: string;
  supplier_nic: string;
  supplier_address: string;
  supplier_bank: string;
  supplier_account_number: string;
  supplier_branch: string;
  vehicle_reg: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_fuel_type: string;
  vehicle_transmission: string;
  vehicle_km: string;
  agreement_start_date: string;
  agreement_period: string;
  renew_date: string;
  monthly_cost: string;
  payment_frequency: string;
  payment_days: string;
  payment_type: string;
  printed_date: string;
  notes_section: string;
}

function replacePlaceholders(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || '—');
  }
  return result;
}

export async function renderRentalAgreement(rentalId: string): Promise<{ html: string; rental_number: string } | { error: string }> {
  await requireAuth();

  const { data: rental } = await supabaseAdmin
    .from('rentals')
    .select('*, customer:customers(*), guarantor:guarantors(*), vehicle:vehicles(*)')
    .eq('id', rentalId)
    .single();

  if (!rental) return { error: 'Rental not found' };

  const { data: settings } = await supabaseAdmin.from('company_settings').select('*').single();

  const { data: template } = await supabaseAdmin
    .from('agreement_templates')
    .select('content')
    .eq('type', 'rental')
    .eq('is_active', true)
    .single();

  const defaultTemplate = template?.content || '';

  const cust = rental.customer || {};
  const guar = rental.guarantor || {};
  const veh = rental.vehicle || {};

  const values: Record<string, string> = {
    company_name: settings?.company_name || 'MRC',
    company_address: formatAddress(settings) || '—',
    company_phone: settings?.phone || '—',
    rental_number: rental.rental_number || '—',
    customer_name: cust.name || '—',
    customer_nic: cust.nic || '—',
    customer_phone: cust.phone || '—',
    customer_phone2: cust.phone2 || '—',
    customer_email: cust.email || '—',
    customer_address: formatAddress(cust) || '—',
    customer_license: cust.license_number || '—',
    guarantor_name: guar.name || '—',
    guarantor_nic: guar.nic || '—',
    guarantor_phone: guar.phone || '—',
    guarantor_address: formatAddress(guar) || '—',
    vehicle_reg: veh.reg_number || '—',
    vehicle_brand: veh.brand || '—',
    vehicle_model: veh.model || '—',
    vehicle_year: veh.year?.toString() || '—',
    vehicle_fuel_type: veh.fuel_type || '—',
    vehicle_transmission: veh.transmission || '—',
    pickup_km: ((rental.pickup_km || 0).toLocaleString()) + ' km',
    return_km: rental.return_km ? (rental.return_km.toLocaleString() + ' km') : '—',
    start_date: formatDate(rental.start_date),
    end_date: formatDate(rental.end_date),
    total_days: (rental.total_days || 0).toString(),
    daily_rate: formatCurrency(rental.daily_rate),
    additional_charges: formatCurrency(rental.additional_charges || 0),
    discount: formatCurrency(rental.discount || 0),
    total_amount: formatCurrency(rental.total_amount || 0),
    deposit: formatCurrency(rental.deposit || 0),
    printed_date: formatDate(new Date().toISOString()),
    notes_section: rental.notes ? `<div class="mb-6 bg-amber-50 border border-amber-100 rounded-lg p-4"><p class="text-xs text-amber-700 font-semibold mb-1">Notes</p><p class="text-sm text-amber-900">${rental.notes}</p></div>` : '',
  };

  return {
    html: replacePlaceholders(defaultTemplate, values),
    rental_number: rental.rental_number,
  };
}

export async function renderSupplierAgreement(vehicleId: string): Promise<{ html: string; vehicle_reg: string } | { error: string }> {
  await requireAuth();

  const { data: vehicle } = await supabaseAdmin
    .from('vehicles')
    .select('*, supplier:suppliers(*)')
    .eq('id', vehicleId)
    .single();

  if (!vehicle) return { error: 'Vehicle not found' };
  if (vehicle.source !== 'Supplier' || !vehicle.supplier) return { error: 'Vehicle is not from a supplier' };

  const { data: settings } = await supabaseAdmin.from('company_settings').select('*').single();

  const { data: template } = await supabaseAdmin
    .from('agreement_templates')
    .select('content')
    .eq('type', 'supplier')
    .eq('is_active', true)
    .single();

  const defaultTemplate = template?.content || '';

  const sup = vehicle.supplier || {};

  const values: Record<string, string> = {
    company_name: settings?.company_name || 'MRC',
    company_address: formatAddress(settings) || '—',
    company_phone: settings?.phone || '—',
    supplier_name: sup.name || '—',
    supplier_phone: sup.phone || '—',
    supplier_email: sup.email || '—',
    supplier_nic: sup.nic || '—',
    supplier_address: formatAddress(sup) || '—',
    supplier_bank: sup.bank || '—',
    supplier_account_number: sup.account_number || '—',
    supplier_branch: sup.branch || '—',
    vehicle_reg: vehicle.reg_number || '—',
    vehicle_brand: vehicle.brand || '—',
    vehicle_model: vehicle.model || '—',
    vehicle_year: vehicle.year?.toString() || '—',
    vehicle_fuel_type: vehicle.fuel_type || '—',
    vehicle_transmission: vehicle.transmission || '—',
    vehicle_km: ((vehicle.current_km || 0).toLocaleString()) + ' km',
    agreement_start_date: formatDate(vehicle.agreement_start_date),
    agreement_period: vehicle.agreement_period || '—',
    renew_date: formatDate(vehicle.renew_date),
    monthly_cost: vehicle.monthly_cost ? formatCurrency(vehicle.monthly_cost) : '—',
    payment_frequency: vehicle.payment_frequency === '15_days' ? '15 Days (2x/month)' : '1 Month',
    payment_days: vehicle.payment_days || '—',
    payment_type: vehicle.payment_type || '—',
    printed_date: formatDate(new Date().toISOString()),
    notes_section: vehicle.notes ? `<div class="mb-6 bg-amber-50 border border-amber-100 rounded-lg p-4"><p class="text-xs text-amber-700 font-semibold mb-1">Notes</p><p class="text-sm text-amber-900">${vehicle.notes}</p></div>` : '',
  };

  return {
    html: replacePlaceholders(defaultTemplate, values),
    vehicle_reg: vehicle.reg_number,
  };
}
