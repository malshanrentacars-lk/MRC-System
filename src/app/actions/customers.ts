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
import { Customer } from '@/types';
import { upsertContact, updateContact, extractContactPayload, flattenContact } from '@/lib/contacts';

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
    .select('id, contact_id, license_number, license_expiry, driving_license_front_url, driving_license_front_path, driving_license_back_url, driving_license_back_path, utility_bill_path, contact:contacts!inner(*)', { count: 'exact' })
    .eq('contacts.is_active', true)
    .order('name', { referencedTable: 'contacts', ascending: true });

  if (params?.search) {
    const s = params.search;
    query = query.or(`contacts.name.ilike.%${s}%,contacts.phone.ilike.%${s}%,contacts.nic.ilike.%${s}%`);
  }

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const flattened = (data ?? []).map(row => flattenContact(row as Record<string, unknown>) as unknown as Customer);
  return { data: flattened, count: count ?? 0 };
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
    .select('id, contact_id, license_number, license_expiry, driving_license_front_url, driving_license_front_path, driving_license_back_url, driving_license_back_path, utility_bill_path, contact:contacts(*), guarantors(*)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  const flattened = flattenContact(data as Record<string, unknown>) as Record<string, unknown>;
  if (flattened.guarantors && Array.isArray(flattened.guarantors)) {
    flattened.guarantors = flattened.guarantors.map((g: Record<string, unknown>) => flattenContact(g));
  }
  return flattened as unknown as Customer;
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

  const contactPayload = extractContactPayload(formData);
  const address = readAddressForm(formData);
  Object.assign(contactPayload, {
    street_address: address.street_address ?? contactPayload.street_address,
    street_address_2: address.street_address_2 ?? contactPayload.street_address_2,
    city: address.city ?? contactPayload.city,
    postal_code: address.postal_code ?? contactPayload.postal_code,
  });

  const nic_front_url = contactPayload.nic_front_url;
  const nic_back_url = contactPayload.nic_back_url;
  const photo_url = contactPayload.photo_url;
  const utility_bill_url = (formData.get('utility_bill_url') as string) || null;

  const contactId = await upsertContact({
    ...contactPayload,
    nic_front_url,
    nic_back_url,
    photo_url,
    utility_bill_url,
  });

  const payload = {
    contact_id: contactId,
    license_number: formData.get('license_number') as string || null,
    license_expiry: formData.get('license_expiry') as string || null,
    driving_license_front_url: (formData.get('driving_license_front_url') as string) || null,
    driving_license_front_path: (formData.get('driving_license_front_path') as string) || null,
    driving_license_back_url: (formData.get('driving_license_back_url') as string) || null,
    driving_license_back_path: (formData.get('driving_license_back_path') as string) || null,
    utility_bill_path: (formData.get('utility_bill_path') as string) || null,
  };

  const { data, error } = await supabaseAdmin.from('customers').insert(payload).select().single();
  if (error) return { error: error.message };

  revalidatePath('/customers');
  revalidateTag(CUSTOMERS_TAG);
  revalidateTag(DASHBOARD_TAG);
  await logActivity({ action: 'created', module: 'Customers', entity_id: data.id, entity_label: contactPayload.name });
  return { data };
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireAuth();

  const contactPayload = extractContactPayload(formData);
  const address = readAddressForm(formData);
  Object.assign(contactPayload, {
    street_address: address.street_address ?? contactPayload.street_address,
    street_address_2: address.street_address_2 ?? contactPayload.street_address_2,
    city: address.city ?? contactPayload.city,
    postal_code: address.postal_code ?? contactPayload.postal_code,
  });

  const nic_front_url = contactPayload.nic_front_url;
  const nic_back_url = contactPayload.nic_back_url;
  const photo_url = contactPayload.photo_url;
  const utility_bill_url = (formData.get('utility_bill_url') as string) || null;

  const { data: current } = await supabaseAdmin
    .from('customers')
    .select('contact_id, license_number, license_expiry, driving_license_front_url, driving_license_front_path, driving_license_back_url, driving_license_back_path, utility_bill_path, contact:contacts(*)')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Customer not found' };

  const currentFlat = flattenContact(current as Record<string, unknown>) as Record<string, unknown>;

  if (current.contact_id) {
    const oldNicFrontUrl = (currentFlat.nic_front_url as string) ?? null;
    const oldNicBackUrl = (currentFlat.nic_back_url as string) ?? null;
    const oldPhotoUrl = (currentFlat.photo_url as string) ?? null;
    const oldUtilityBillUrl = (currentFlat.utility_bill_url as string) ?? null;

    await Promise.all([
      deleteOldStorageFile(oldNicFrontUrl, nic_front_url ?? null),
      deleteOldStorageFile(oldNicBackUrl, nic_back_url ?? null),
      deleteOldStorageFile(oldPhotoUrl, photo_url ?? null),
      deleteOldStorageFile(oldUtilityBillUrl, utility_bill_url ?? null),
    ]);

    await updateContact(current.contact_id, {
      ...contactPayload,
      nic_front_url,
      nic_back_url,
      photo_url,
      utility_bill_url,
    });
  }

  const rolePayload: Record<string, unknown> = {
    license_number: formData.get('license_number') as string || null,
    license_expiry: formData.get('license_expiry') as string || null,
    driving_license_front_url: (formData.get('driving_license_front_url') as string) || null,
    driving_license_front_path: (formData.get('driving_license_front_path') as string) || null,
    driving_license_back_url: (formData.get('driving_license_back_url') as string) || null,
    driving_license_back_path: (formData.get('driving_license_back_path') as string) || null,
    utility_bill_path: (formData.get('utility_bill_path') as string) || null,
  };

  const { error } = await supabaseAdmin.from('customers').update(rolePayload).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/customers');
  revalidatePath(`/customers/${id}`);
  revalidateTag(CUSTOMERS_TAG);
  revalidateTag(DASHBOARD_TAG);

  const oldValues = currentFlat;
  const newValues = {
    ...contactPayload,
    nic_front_url: nic_front_url ?? undefined,
    nic_back_url: nic_back_url ?? undefined,
    photo_url: photo_url ?? undefined,
    utility_bill_url: utility_bill_url ?? undefined,
    ...rolePayload,
  };
  const diff = buildDiff(oldValues, newValues, CUSTOMER_FIELDS, ['address']);
  await logActivity({ action: 'updated', module: 'Customers', entity_id: id, entity_label: contactPayload.name, ...diff });
  return { success: true };
}

export async function deleteCustomer(id: string) {
  await requireAuth();
  const { data: c } = await supabaseAdmin
    .from('customers')
    .select('contact_id, contact:contacts(name)')
    .eq('id', id)
    .single();
  const name = c?.contact && typeof c.contact === 'object' && !Array.isArray(c.contact)
    ? (c.contact as { name?: string }).name
    : undefined;

  if (c?.contact_id) {
    await supabaseAdmin.from('contacts').update({ is_active: false }).eq('id', c.contact_id);
  }

  await logActivity({ action: 'deleted', module: 'Customers', entity_id: id, entity_label: name ?? id });
  revalidatePath('/customers');
  revalidateTag(CUSTOMERS_TAG);
  revalidateTag(DASHBOARD_TAG);
  return { success: true };
}

async function _fetchCustomerByNic(nic: string) {
  if (!nic?.trim()) return null;
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('nic', nic.trim())
    .eq('is_active', true)
    .maybeSingle();

  if (!contact) return null;

  const { data } = await supabaseAdmin
    .from('customers')
    .select('id, contact_id, license_number, license_expiry, driving_license_front_url, driving_license_front_path, driving_license_back_url, driving_license_back_path, utility_bill_path, contact:contacts(*)')
    .eq('contact_id', contact.id)
    .limit(1)
    .single();

  if (!data) return null;
  return flattenContact(data as Record<string, unknown>) as unknown as Customer;
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
