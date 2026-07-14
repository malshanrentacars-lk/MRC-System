'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { deleteOldStorageFile } from '@/app/actions/upload';
import { logActivity } from '@/app/actions/activity';
import { buildDiff } from '@/lib/diff';
import { readAddressForm } from '@/lib/address';
import { DASHBOARD_TAG, CUSTOMERS_TAG } from '@/lib/cache-tags';

const CUSTOMER_FIELDS: Record<string, string> = {
  name: 'Full Name',
  nic: 'NIC',
  phone: 'Phone',
  phone2: 'Phone 2',
  email: 'Email',
  street_address: 'Street Address',
  street_address_2: 'Street Address 2',
  city: 'City',
  postal_code: 'Postal Code',
  license_number: 'License Number',
  license_expiry: 'License Expiry',
  notes: 'Notes',
};

async function _fetchCustomers(params?: { search?: string; page?: number; pageSize?: number }) {
  let query = supabaseAdmin
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,nic.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
  }

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data: data ?? [], count: count ?? 0 };
}

const _cachedGetCustomers = unstable_cache(
  _fetchCustomers,
  ['customers-list'],
  { tags: [CUSTOMERS_TAG], revalidate: false },
);

export async function getCustomers(params?: { search?: string; page?: number; pageSize?: number }) {
  await requireAuth();
  return _cachedGetCustomers(params);
}

async function _fetchCustomerById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*, guarantors(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

const _cachedGetCustomerById = unstable_cache(
  _fetchCustomerById,
  ['customer-by-id'],
  { tags: [CUSTOMERS_TAG], revalidate: false },
);

export async function getCustomerById(id: string) {
  await requireAuth();
  return _cachedGetCustomerById(id);
}

export async function createCustomer(formData: FormData) {
  await requireAuth();

  // FileUploader always emits hidden input — empty string means deleted → null in DB
  const nic_front_url = (formData.get('nic_front_url') as string) || null;
  const nic_back_url = (formData.get('nic_back_url') as string) || null;
  const photo_url = (formData.get('customer_photo_url') as string) || (formData.get('photo_url') as string) || null;
  const utility_bill_url = (formData.get('utility_bill_url') as string) || null;
  const driving_license_front_url = (formData.get('driving_license_front_url') as string) || null;
  const driving_license_back_url = (formData.get('driving_license_back_url') as string) || null;
  const address = readAddressForm(formData);

  const payload: Record<string, unknown> = {
    name: formData.get('name') as string,
    nic: formData.get('nic') as string || null,
    phone: formData.get('phone') as string || null,
    phone2: formData.get('phone2') as string || null,
    email: formData.get('email') as string || null,
    ...address,
    license_number: formData.get('license_number') as string || null,
    license_expiry: formData.get('license_expiry') as string || null,
    notes: formData.get('notes') as string || null,
    // Always include file columns — null clears them in the DB
    nic_front_url,
    nic_back_url,
    photo_url,
    utility_bill_url,
    driving_license_front_url,
    driving_license_back_url,
  };

  const { data, error } = await supabaseAdmin.from('customers').insert(payload).select().single();
  if (error) return { error: error.message };

  revalidatePath('/customers');
  revalidateTag(CUSTOMERS_TAG);
  revalidateTag(DASHBOARD_TAG);
  await logActivity({ action: 'created', module: 'Customers', entity_id: data.id, entity_label: data.name });
  return { data };
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireAuth();

  // FileUploader always emits hidden input — empty string means the file was deleted
  const nic_front_url = (formData.get('nic_front_url') as string) || null;
  const nic_back_url = (formData.get('nic_back_url') as string) || null;
  const photo_url = (formData.get('customer_photo_url') as string) || (formData.get('photo_url') as string) || null;
  const utility_bill_url = (formData.get('utility_bill_url') as string) || null;
  const driving_license_front_url = (formData.get('driving_license_front_url') as string) || null;
  const driving_license_back_url = (formData.get('driving_license_back_url') as string) || null;
  const address = readAddressForm(formData);

  // Fetch current record to clean up old storage files + build diff
  const { data: current } = await supabaseAdmin
    .from('customers')
    .select('name, nic, phone, phone2, email, street_address, street_address_2, city, postal_code, address, license_number, license_expiry, notes, nic_front_url, nic_back_url, photo_url, utility_bill_url, driving_license_front_url, driving_license_back_url')
    .eq('id', id)
    .single();

  if (current) {
    await Promise.all([
      deleteOldStorageFile(current.nic_front_url, nic_front_url),
      deleteOldStorageFile(current.nic_back_url, nic_back_url),
      deleteOldStorageFile(current.photo_url, photo_url),
      deleteOldStorageFile(current.utility_bill_url, utility_bill_url),
      deleteOldStorageFile(current.driving_license_front_url, driving_license_front_url),
      deleteOldStorageFile(current.driving_license_back_url, driving_license_back_url),
    ]);
  }

  const payload: Record<string, unknown> = {
    name: formData.get('name') as string,
    nic: formData.get('nic') as string || null,
    phone: formData.get('phone') as string || null,
    phone2: formData.get('phone2') as string || null,
    email: formData.get('email') as string || null,
    ...address,
    license_number: formData.get('license_number') as string || null,
    license_expiry: formData.get('license_expiry') as string || null,
    notes: formData.get('notes') as string || null,
    // Always write file columns — null clears them in the DB
    nic_front_url,
    nic_back_url,
    photo_url,
    utility_bill_url,
    driving_license_front_url,
    driving_license_back_url,
  };

  const { error } = await supabaseAdmin.from('customers').update(payload).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/customers');
  revalidatePath(`/customers/${id}`);
  revalidateTag(CUSTOMERS_TAG);
  revalidateTag(DASHBOARD_TAG);
  const diff = current ? buildDiff(current as Record<string, unknown>, payload, CUSTOMER_FIELDS, ['address']) : { details: '', old_value: '', new_value: '' };
  await logActivity({ action: 'updated', module: 'Customers', entity_id: id, entity_label: payload.name as string, ...diff });
  return { success: true };
}

export async function deleteCustomer(id: string) {
  await requireAuth();
  const { data: c } = await supabaseAdmin.from('customers').select('name').eq('id', id).single();
  await supabaseAdmin.from('customers').update({ is_active: false }).eq('id', id);
  await logActivity({ action: 'deleted', module: 'Customers', entity_id: id, entity_label: c?.name ?? id });
  revalidatePath('/customers');
  revalidateTag(CUSTOMERS_TAG);
  revalidateTag(DASHBOARD_TAG);
  return { success: true };
}

async function _fetchCustomerByNic(nic: string) {
  if (!nic?.trim()) return null;
  const { data } = await supabaseAdmin
    .from('customers')
    .select('*')
    .ilike('nic', nic.trim())
    .eq('is_active', true)
    .limit(1)
    .single();
  return data ?? null;
}

const _cachedGetCustomerByNic = unstable_cache(
  _fetchCustomerByNic,
  ['customer-by-nic'],
  { tags: [CUSTOMERS_TAG], revalidate: false },
);

export async function getCustomerByNic(nic: string) {
  await requireAuth();
  return _cachedGetCustomerByNic(nic);
}
