'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { deleteOldStorageFile } from '@/app/actions/upload';
import { logActivity } from '@/app/actions/activity';
import { buildDiff } from '@/lib/diff';
import { readAddressForm } from '@/lib/address';

const SUPPLIER_FIELDS: Record<string, string> = {
  name: 'Name', company_id: 'Company', phone: 'Phone', phone2: 'Phone 2',
  email: 'Email', street_address: 'Street Address', street_address_2: 'Street Address 2', city: 'City', postal_code: 'Postal Code', nic: 'NIC', notes: 'Notes',
  bank: 'Bank', account_number: 'Account Number', branch: 'Branch',
};

const GUARANTOR_FIELDS: Record<string, string> = {
  name: 'Name', nic: 'NIC', phone: 'Phone', phone2: 'Phone 2',
  street_address: 'Street Address', street_address_2: 'Street Address 2', city: 'City', postal_code: 'Postal Code', relationship: 'Relationship', notes: 'Notes',
};

export async function getSuppliers(params?: { search?: string; page?: number; pageSize?: number }) {
  await requireAuth();

  let query = supabaseAdmin
    .from('suppliers')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%,nic.ilike.%${params.search}%`);
  }

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data ?? [], count: count ?? 0 };
}

function buildSupplierPayload(formData: FormData) {
  // FileUploader always emits hidden input — empty string means deleted → null in DB
  const nic_front_url = (formData.get('nic_front_url') as string) || null;
  const nic_back_url = (formData.get('nic_back_url') as string) || null;
  const address = readAddressForm(formData);

  return {
    name: formData.get('name') as string,
    company_id: (formData.get('company_id') as string || '').trim() || null,
    phone: formData.get('phone') as string || null,
    phone2: formData.get('phone2') as string || null,
    email: formData.get('email') as string || null,
    nic: formData.get('nic') as string || null,
    bank: formData.get('bank') as string || null,
    account_number: formData.get('account_number') as string || null,
    branch: formData.get('branch') as string || null,
    notes: formData.get('notes') as string || null,
    ...address,
    // Always include — null clears the DB column (persists deletion)
    nic_front_url,
    nic_back_url,
  };
}

export async function createSupplier(formData: FormData) {
  await requireAuth();

  const payload = buildSupplierPayload(formData);
  const { data, error } = await supabaseAdmin.from('suppliers').insert(payload).select().single();

  if (error) {
    if (error.message.includes('column') && error.message.includes('schema cache')) {
      // Schema migration not yet run — retry without company/file columns
      const { company_id, name, phone, phone2, email, address, nic, notes } = payload;
      const { data: d2, error: e2 } = await supabaseAdmin.from('suppliers')
        .insert({ name, phone, phone2, email, address, nic, notes }).select().single();
      if (e2) return { error: e2.message };
      revalidatePath('/suppliers');
      return { data: d2 };
    }
    return { error: error.message };
  }

  revalidatePath('/suppliers');
  await logActivity({ action: 'created', module: 'Suppliers', entity_id: data.id, entity_label: data.name });
  return { data };
}

export async function updateSupplier(id: string, formData: FormData) {
  await requireAuth();

  const payload = buildSupplierPayload(formData);

  // Fetch current record and clean up old storage files
  const { data: current } = await supabaseAdmin
    .from('suppliers')
    .select('name, company_id, phone, phone2, email, street_address, street_address_2, city, postal_code, address, nic, notes, bank, account_number, branch, nic_front_url, nic_back_url')
    .eq('id', id)
    .single();

  if (current) {
    await Promise.all([
      deleteOldStorageFile(current.nic_front_url, payload.nic_front_url ?? null),
      deleteOldStorageFile(current.nic_back_url, payload.nic_back_url ?? null),
    ]);
  }

  const { error } = await supabaseAdmin.from('suppliers').update(payload).eq('id', id);

  if (error) {
    if (error.message.includes('column') && error.message.includes('schema cache')) {
      const { company_id, name, phone, phone2, email, address, nic, notes } = payload;
      const { error: e2 } = await supabaseAdmin.from('suppliers')
        .update({ name, phone, phone2, email, address, nic, notes }).eq('id', id);
      if (e2) return { error: e2.message };
      revalidatePath('/suppliers');
      revalidatePath(`/suppliers/${id}`);
      return { success: true };
    }
    return { error: error.message };
  }

  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${id}`);
  const diff = current ? buildDiff(current as Record<string, unknown>, payload as Record<string, unknown>, SUPPLIER_FIELDS, ['address']) : { details: '', old_value: '', new_value: '' };
  await logActivity({ action: 'updated', module: 'Suppliers', entity_id: id, entity_label: payload.name as string, ...diff });
  return { success: true };
}

export async function deleteSupplier(id: string) {
  await requireAuth();
  const { data: s } = await supabaseAdmin.from('suppliers').select('name').eq('id', id).single();
  await supabaseAdmin.from('suppliers').update({ is_active: false }).eq('id', id);
  await logActivity({ action: 'deleted', module: 'Suppliers', entity_id: id, entity_label: s?.name ?? id });
  revalidatePath('/suppliers');
  return { success: true };
}

// ============================================================
// GUARANTORS
// ============================================================

export async function getGuarantors(params?: { search?: string; customerId?: string; page?: number; pageSize?: number }) {
  await requireAuth();

  let query = supabaseAdmin
    .from('guarantors')
    .select('*, customer:customers(id, name, phone)', { count: 'exact' })
    .order('name', { ascending: true });

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,nic.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
  }
  if (params?.customerId) query = query.eq('customer_id', params.customerId);

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data ?? [], count: count ?? 0 };
}

function buildGuarantorPayload(formData: FormData) {
  // FileUploader always emits hidden input — empty string means deleted → null in DB
  const nic_front_url = (formData.get('nic_front_url') as string) || null;
  const nic_back_url = (formData.get('nic_back_url') as string) || null;
  const photo_url = (formData.get('photo_url') as string) || null;
  const utility_bill_url = (formData.get('utility_bill_url') as string) || null;
  const address = readAddressForm(formData);

  return {
    customer_id: formData.get('customer_id') as string || null,
    name: formData.get('name') as string,
    nic: formData.get('nic') as string || null,
    phone: formData.get('phone') as string || null,
    phone2: formData.get('phone2') as string || null,
    relationship: formData.get('relationship') as string || null,
    notes: formData.get('notes') as string || null,
    ...address,
    // Always include — null clears the DB column (persists deletion)
    nic_front_url,
    nic_back_url,
    photo_url,
    utility_bill_url,
  };
}

export async function createGuarantor(formData: FormData) {
  await requireAuth();

  const payload = buildGuarantorPayload(formData);
  const { data, error } = await supabaseAdmin.from('guarantors').insert(payload).select().single();

  if (error) {
    if (error.message.includes('column') && error.message.includes('schema cache')) {
      const { customer_id, name, nic, phone, phone2, address, relationship, notes } = payload;
      const { data: d2, error: e2 } = await supabaseAdmin.from('guarantors')
        .insert({ customer_id, name, nic, phone, phone2, address, relationship, notes }).select().single();
      if (e2) return { error: e2.message };
      revalidatePath('/guarantors');
      return { data: d2 };
    }
    return { error: error.message };
  }

  revalidatePath('/guarantors');
  await logActivity({ action: 'created', module: 'Guarantors', entity_id: data.id, entity_label: data.name });
  return { data };
}

export async function updateGuarantor(id: string, formData: FormData) {
  await requireAuth();

  const payload = buildGuarantorPayload(formData);

  // Fetch current record and clean up old storage files
  const { data: current } = await supabaseAdmin
    .from('guarantors')
    .select('name, nic, phone, phone2, street_address, street_address_2, city, postal_code, address, relationship, notes, nic_front_url, nic_back_url, photo_url, utility_bill_url')
    .eq('id', id)
    .single();

  if (current) {
    await Promise.all([
      deleteOldStorageFile(current.nic_front_url, payload.nic_front_url ?? null),
      deleteOldStorageFile(current.nic_back_url, payload.nic_back_url ?? null),
      deleteOldStorageFile(current.photo_url, payload.photo_url ?? null),
      deleteOldStorageFile(current.utility_bill_url, payload.utility_bill_url ?? null),
    ]);
  }

  const { error } = await supabaseAdmin.from('guarantors').update(payload).eq('id', id);

  if (error) {
    if (error.message.includes('column') && error.message.includes('schema cache')) {
      const { customer_id, name, nic, phone, phone2, address, relationship, notes } = payload;
      const { error: e2 } = await supabaseAdmin.from('guarantors')
        .update({ customer_id, name, nic, phone, phone2, address, relationship, notes }).eq('id', id);
      if (e2) return { error: e2.message };
      revalidatePath('/guarantors');
      revalidatePath(`/guarantors/${id}`);
      return { success: true };
    }
    return { error: error.message };
  }

  revalidatePath('/guarantors');
  revalidatePath(`/guarantors/${id}`);
  const diff = current ? await buildDiff(current as Record<string, unknown>, payload as Record<string, unknown>, GUARANTOR_FIELDS, ['address']) : { details: '', old_value: '', new_value: '' };
  await logActivity({ action: 'updated', module: 'Guarantors', entity_id: id, entity_label: payload.name as string, ...diff });
  return { success: true };
}

export async function deleteGuarantor(id: string) {
  await requireAuth();
  const { data: g } = await supabaseAdmin.from('guarantors').select('name').eq('id', id).single();
  await supabaseAdmin.from('guarantors').delete().eq('id', id);
  await logActivity({ action: 'deleted', module: 'Guarantors', entity_id: id, entity_label: g?.name ?? id });
  revalidatePath('/guarantors');
  return { success: true };
}
