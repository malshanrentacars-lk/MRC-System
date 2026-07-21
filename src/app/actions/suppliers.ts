'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { deleteOldStorageFile, moveStorageFile } from '@/app/actions/upload';
import { logActivity } from '@/app/actions/activity';
import { buildDiff } from '@/lib/diff';
import { readAddressForm } from '@/lib/address';
import { SUPPLIERS_TAG, GUARANTORS_TAG, VEHICLES_TAG } from '@/lib/cache-tags';
import { Supplier, Guarantor } from '@/types';
import { upsertContact, updateContact, extractContactPayload, flattenContact } from '@/lib/contacts';

const SUPPLIER_FIELDS: Record<string, string> = {
  name: 'Name', phone: 'Phone', phone2: 'Phone 2',
  email: 'Email', street_address: 'Street Address', street_address_2: 'Street Address 2', city: 'City', postal_code: 'Postal Code', nic: 'NIC', notes: 'Notes',
  bank: 'Bank', account_number: 'Account Number', branch: 'Branch',
};

const GUARANTOR_FIELDS: Record<string, string> = {
  name: 'Name', nic: 'NIC', phone: 'Phone', phone2: 'Phone 2',
  street_address: 'Street Address', street_address_2: 'Street Address 2', city: 'City', postal_code: 'Postal Code', relationship: 'Relationship', notes: 'Notes',
};

// ============================================================
// SUPPLIERS
// ============================================================

async function _fetchSuppliers(params?: { search?: string; page?: number; pageSize?: number }) {
  let query = supabaseAdmin
    .from('suppliers')
    .select('id, contact_id, bank, account_number, branch, company_id, contact:contacts!inner(*)', { count: 'exact' })
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

  const flattened = (data ?? []).map(row => flattenContact(row as Record<string, unknown>) as unknown as Supplier);
  return { data: flattened, count: count ?? 0 };
}

const _cachedGetSuppliers = unstable_cache(
  _fetchSuppliers,
  ['suppliers-list'],
  { tags: [SUPPLIERS_TAG], revalidate: false },
);

export async function getSuppliers(params?: { search?: string; page?: number; pageSize?: number }) {
  await requireAuth();
  return _cachedGetSuppliers(params);
}

function buildSupplierContactPayload(formData: FormData) {
  const address = readAddressForm(formData);
  const base = extractContactPayload(formData);
  return {
    ...base,
    street_address: address.street_address ?? base.street_address,
    street_address_2: address.street_address_2 ?? base.street_address_2,
    city: address.city ?? base.city,
    postal_code: address.postal_code ?? base.postal_code,
    photo_url: (formData.get('photo_url') as string) || null,
  };
}

function buildSupplierRolePayload(formData: FormData) {
  return {
    bank: formData.get('bank') as string || null,
    account_number: formData.get('account_number') as string || null,
    branch: formData.get('branch') as string || null,
    company_id: formData.get('company_id') as string || null,
  };
}

async function organizeNewSupplierDocuments(
  nic: string,
  supplierId: string,
  docUrls: { nic_front_url?: string | null; nic_back_url?: string | null }
) {
  if (!nic) return;

  const docTypes = [
    { urlField: 'nic_front_url' as const, subfolder: 'nic_front' },
    { urlField: 'nic_back_url' as const, subfolder: 'nic_back' },
  ];

  const updates: Record<string, string | null> = {};

  for (const { urlField, subfolder } of docTypes) {
    const oldUrl = docUrls[urlField];
    if (!oldUrl) continue;

    const match = oldUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!match) continue;

    const bucket = match[1];
    const oldPath = decodeURIComponent(match[2]);

    if (!oldPath.startsWith('new/')) continue;

    const filename = oldPath.split('/').pop();
    if (!filename) continue;

    const newPath = `${nic}/${subfolder}/${filename}`;

    const result = await moveStorageFile(bucket, oldPath, newPath);
    if (result.error) {
      console.warn(`Failed to move ${subfolder} document: ${result.error}`);
      continue;
    }

    updates[urlField] = result.url!;
  }

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin.from('contacts').update(updates as Record<string, string | null>).eq('id', (await supabaseAdmin.from('suppliers').select('contact_id').eq('id', supplierId).single()).data?.contact_id);
  }
}

export async function createSupplier(formData: FormData) {
  await requireAuth();

  const contactPayload = buildSupplierContactPayload(formData);
  const nic = contactPayload.nic;

  if (nic) {
    const { data: existing } = await supabaseAdmin.from('contacts')
      .select('id').eq('nic', nic).maybeSingle();
    if (existing) {
      const { data: dupSupplier } = await supabaseAdmin.from('suppliers')
        .select('id').eq('contact_id', existing.id).maybeSingle();
      if (dupSupplier) return { error: "Supplier NIC already available." };
    }
  }

  const contactId = await upsertContact(contactPayload);

  const rolePayload = buildSupplierRolePayload(formData);
  const { data, error } = await supabaseAdmin.from('suppliers')
    .insert({ ...rolePayload, contact_id: contactId })
    .select().single();

  if (error) return { error: error.message };

  if (nic) {
    await organizeNewSupplierDocuments(nic, data.id, {
      nic_front_url: contactPayload.nic_front_url,
      nic_back_url: contactPayload.nic_back_url,
    });
  }

  revalidatePath('/suppliers');
  revalidateTag(SUPPLIERS_TAG);
  await logActivity({ action: 'created', module: 'Suppliers', entity_id: data.id, entity_label: contactPayload.name });
  return { data };
}

export async function updateSupplier(id: string, formData: FormData) {
  await requireAuth();

  const contactPayload = buildSupplierContactPayload(formData);
  const nic = contactPayload.nic;

  if (nic) {
    const { data: existing } = await supabaseAdmin.from('contacts')
      .select('id').eq('nic', nic).maybeSingle();
    if (existing) {
      const { data: dupSupplier } = await supabaseAdmin.from('suppliers')
        .select('id').eq('contact_id', existing.id).neq('id', id).maybeSingle();
      if (dupSupplier) return { error: "Supplier NIC already available." };
    }
  }

  const { data: current } = await supabaseAdmin
    .from('suppliers')
    .select('contact_id, bank, account_number, branch, company_id, contact:contacts(*)')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Supplier not found' };

  const currentFlat = flattenContact(current as Record<string, unknown>) as Record<string, unknown>;

  if (current.contact_id) {
    await Promise.all([
      deleteOldStorageFile((currentFlat.nic_front_url as string) ?? null, contactPayload.nic_front_url ?? null),
      deleteOldStorageFile((currentFlat.nic_back_url as string) ?? null, contactPayload.nic_back_url ?? null),
    ]);

    await updateContact(current.contact_id, contactPayload);
  }

  const rolePayload = buildSupplierRolePayload(formData);
  const { error } = await supabaseAdmin.from('suppliers').update(rolePayload).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/suppliers');
  revalidatePath(`/suppliers/${id}`);
  revalidateTag(SUPPLIERS_TAG);
  const newValues = { ...contactPayload, ...rolePayload };
  const diff = currentFlat ? buildDiff(currentFlat, newValues as Record<string, unknown>, SUPPLIER_FIELDS, ['address']) : { details: '', old_value: '', new_value: '' };
  await logActivity({ action: 'updated', module: 'Suppliers', entity_id: id, entity_label: contactPayload.name, ...diff });
  return { success: true };
}

export async function deleteSupplier(id: string) {
  await requireAuth();
  const { data: s } = await supabaseAdmin
    .from('suppliers')
    .select('contact_id, contact:contacts(name)')
    .eq('id', id)
    .single();
  const name = s?.contact && typeof s.contact === 'object' && !Array.isArray(s.contact)
    ? (s.contact as { name?: string }).name : undefined;
  if (s?.contact_id) {
    await supabaseAdmin.from('contacts').update({ is_active: false }).eq('id', s.contact_id);
  }
  await logActivity({ action: 'deleted', module: 'Suppliers', entity_id: id, entity_label: name ?? id });
  revalidatePath('/suppliers');
  revalidateTag(SUPPLIERS_TAG);
  return { success: true };
}

// ============================================================
// GUARANTORS
// ============================================================

async function _fetchGuarantors(params?: { search?: string; customerId?: string; page?: number; pageSize?: number }) {
  let query = supabaseAdmin
    .from('guarantors')
    .select('id, contact_id, customer_id, relationship, contact:contacts!inner(*), customer:customers(id, contact_id, contact:contacts(name, phone))', { count: 'exact' })
    .order('name', { referencedTable: 'contacts', ascending: true });

  if (params?.search) {
    const s = params.search;
    query = query.or(`contacts.name.ilike.%${s}%,contacts.phone.ilike.%${s}%,contacts.nic.ilike.%${s}%`);
  }
  if (params?.customerId) query = query.eq('customer_id', params.customerId);

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const flattened = (data ?? []).map(row => {
    const flat = flattenContact(row as Record<string, unknown>);
    if (flat.customer && typeof flat.customer === 'object' && !Array.isArray(flat.customer)) {
      flat.customer = flattenContact(flat.customer as Record<string, unknown>);
    }
    return flat as unknown as Guarantor;
  });
  return { data: flattened, count: count ?? 0 };
}

const _cachedGetGuarantors = unstable_cache(
  _fetchGuarantors,
  ['guarantors-list'],
  { tags: [GUARANTORS_TAG], revalidate: false },
);

export async function getGuarantors(params?: { search?: string; customerId?: string; page?: number; pageSize?: number }) {
  await requireAuth();
  return _cachedGetGuarantors(params);
}

function buildGuarantorContactPayload(formData: FormData) {
  const address = readAddressForm(formData);
  const base = extractContactPayload(formData);
  return {
    ...base,
    street_address: address.street_address ?? base.street_address,
    street_address_2: address.street_address_2 ?? base.street_address_2,
    city: address.city ?? base.city,
    postal_code: address.postal_code ?? base.postal_code,
    photo_url: (formData.get('photo_url') as string) || null,
    utility_bill_url: (formData.get('utility_bill_url') as string) || null,
  };
}

function buildGuarantorRolePayload(formData: FormData) {
  return {
    customer_id: formData.get('customer_id') as string || null,
    relationship: formData.get('relationship') as string || null,
    utility_bill_path: (formData.get('utility_bill_path') as string) || null,
  };
}

export async function createGuarantor(formData: FormData) {
  await requireAuth();

  const contactPayload = buildGuarantorContactPayload(formData);
  const contactId = await upsertContact(contactPayload);

  const rolePayload = buildGuarantorRolePayload(formData);
  const { data, error } = await supabaseAdmin.from('guarantors')
    .insert({ ...rolePayload, contact_id: contactId })
    .select().single();

  if (error) return { error: error.message };

  revalidatePath('/guarantors');
  revalidateTag(GUARANTORS_TAG);
  await logActivity({ action: 'created', module: 'Guarantors', entity_id: data.id, entity_label: contactPayload.name });
  return { data };
}

export async function updateGuarantor(id: string, formData: FormData) {
  await requireAuth();

  const contactPayload = buildGuarantorContactPayload(formData);

  const { data: current } = await supabaseAdmin
    .from('guarantors')
    .select('contact_id, customer_id, relationship, utility_bill_path, contact:contacts(*)')
    .eq('id', id)
    .single();

  if (!current) return { error: 'Guarantor not found' };

  const currentFlat = flattenContact(current as Record<string, unknown>) as Record<string, unknown>;

  if (current.contact_id) {
    await Promise.all([
      deleteOldStorageFile((currentFlat.nic_front_url as string) ?? null, contactPayload.nic_front_url ?? null),
      deleteOldStorageFile((currentFlat.nic_back_url as string) ?? null, contactPayload.nic_back_url ?? null),
      deleteOldStorageFile((currentFlat.photo_url as string) ?? null, contactPayload.photo_url ?? null),
      deleteOldStorageFile((currentFlat.utility_bill_url as string) ?? null, contactPayload.utility_bill_url ?? null),
    ]);

    await updateContact(current.contact_id, contactPayload);
  }

  const rolePayload = buildGuarantorRolePayload(formData);
  const { error } = await supabaseAdmin.from('guarantors').update(rolePayload).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/guarantors');
  revalidatePath(`/guarantors/${id}`);
  revalidateTag(GUARANTORS_TAG);
  const newValues = { ...contactPayload, ...rolePayload };
  const diff = currentFlat ? buildDiff(currentFlat, newValues as Record<string, unknown>, GUARANTOR_FIELDS, ['address']) : { details: '', old_value: '', new_value: '' };
  await logActivity({ action: 'updated', module: 'Guarantors', entity_id: id, entity_label: contactPayload.name, ...diff });
  return { success: true };
}

export async function deleteGuarantor(id: string) {
  await requireAuth();
  const { data: g } = await supabaseAdmin
    .from('guarantors')
    .select('contact_id, contact:contacts(name)')
    .eq('id', id)
    .single();
  const name = g?.contact && typeof g.contact === 'object' && !Array.isArray(g.contact)
    ? (g.contact as { name?: string }).name : undefined;
  if (g?.contact_id) {
    await supabaseAdmin.from('contacts').update({ is_active: false }).eq('id', g.contact_id);
  }
  await logActivity({ action: 'deleted', module: 'Guarantors', entity_id: id, entity_label: name ?? id });
  revalidatePath('/guarantors');
  revalidateTag(GUARANTORS_TAG);
  return { success: true };
}

async function _fetchSupplierById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("suppliers")
    .select("id, contact_id, bank, account_number, branch, company_id, contact:contacts(*)")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return flattenContact(data as Record<string, unknown>) as unknown as Supplier;
}

const _cachedGetSupplierById = unstable_cache(
  _fetchSupplierById,
  ['supplier-by-id'],
  { tags: [SUPPLIERS_TAG], revalidate: false },
);

export async function getSupplierById(id: string) {
  await requireAuth();
  return _cachedGetSupplierById(id);
}

export async function getVehiclesBySupplier(supplierId: string) {
  await requireAuth();
  const { data } = await supabaseAdmin
    .from("vehicles")
    .select("*, rentals(total_amount, status)")
    .eq("supplier_id", supplierId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
