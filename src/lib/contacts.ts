import { supabaseAdmin } from '@/lib/supabase';

export interface ContactPayload {
  name: string;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  nic?: string | null;
  street_address?: string | null;
  street_address_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
  nic_front_url?: string | null;
  nic_back_url?: string | null;
  photo_url?: string | null;
  utility_bill_url?: string | null;
}

export async function upsertContact(payload: ContactPayload): Promise<string> {
  if (payload.nic) {
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('nic', payload.nic)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from('contacts').update({
        name: payload.name,
        phone: payload.phone ?? null,
        phone2: payload.phone2 ?? null,
        email: payload.email ?? null,
        street_address: payload.street_address ?? null,
        street_address_2: payload.street_address_2 ?? null,
        city: payload.city ?? null,
        postal_code: payload.postal_code ?? null,
        address: payload.address ?? null,
        notes: payload.notes ?? null,
        nic_front_url: payload.nic_front_url ?? null,
        nic_back_url: payload.nic_back_url ?? null,
        photo_url: payload.photo_url ?? null,
        utility_bill_url: payload.utility_bill_url ?? null,
      }).eq('id', existing.id);
      return existing.id;
    }
  }

  const { data: created, error } = await supabaseAdmin
    .from('contacts')
    .insert({
      name: payload.name,
      phone: payload.phone ?? null,
      phone2: payload.phone2 ?? null,
      email: payload.email ?? null,
      nic: payload.nic ?? null,
      street_address: payload.street_address ?? null,
      street_address_2: payload.street_address_2 ?? null,
      city: payload.city ?? null,
      postal_code: payload.postal_code ?? null,
      address: payload.address ?? null,
      notes: payload.notes ?? null,
      is_active: payload.is_active ?? true,
      nic_front_url: payload.nic_front_url ?? null,
      nic_back_url: payload.nic_back_url ?? null,
      photo_url: payload.photo_url ?? null,
      utility_bill_url: payload.utility_bill_url ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return created.id;
}

export async function updateContact(id: string, payload: ContactPayload): Promise<void> {
  if (payload.nic) {
    const { data: dup } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('nic', payload.nic)
      .neq('id', id)
      .maybeSingle();
    if (dup) throw new Error('Contact with this NIC already exists');
  }

  await supabaseAdmin.from('contacts').update({
    name: payload.name,
    phone: payload.phone ?? null,
    phone2: payload.phone2 ?? null,
    email: payload.email ?? null,
    nic: payload.nic ?? null,
    street_address: payload.street_address ?? null,
    street_address_2: payload.street_address_2 ?? null,
    city: payload.city ?? null,
    postal_code: payload.postal_code ?? null,
    address: payload.address ?? null,
    notes: payload.notes ?? null,
    nic_front_url: payload.nic_front_url ?? null,
    nic_back_url: payload.nic_back_url ?? null,
    photo_url: payload.photo_url ?? null,
    utility_bill_url: payload.utility_bill_url ?? null,
  }).eq('id', id);
}

export function extractContactPayload(formData: FormData): ContactPayload {
  return {
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || null,
    phone2: (formData.get('phone2') as string) || null,
    email: (formData.get('email') as string) || null,
    nic: (formData.get('nic') as string) || null,
    street_address: (formData.get('street_address') as string) || null,
    street_address_2: (formData.get('street_address_2') as string) || null,
    city: (formData.get('city') as string) || null,
    postal_code: (formData.get('postal_code') as string) || null,
    address: null,
    notes: (formData.get('notes') as string) || null,
    nic_front_url: (formData.get('nic_front_url') as string) || null,
    nic_back_url: (formData.get('nic_back_url') as string) || null,
    photo_url: (formData.get('photo_url') as string) || (formData.get('customer_photo_url') as string) || null,
    utility_bill_url: (formData.get('utility_bill_url') as string) || null,
  };
}

interface ContactRow {
  id: string;
  name: string;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  nic?: string | null;
  street_address?: string | null;
  street_address_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
  nic_front_url?: string | null;
  nic_back_url?: string | null;
  photo_url?: string | null;
  utility_bill_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function flattenContact<T extends Record<string, unknown>>(
  row: T & { contact?: ContactRow | ContactRow[] | null }
): T {
  const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;
  if (!contact) return row;
  const result = {
    ...row,
    name: contact.name ?? row.name,
    phone: contact.phone ?? row.phone,
    phone2: contact.phone2 ?? row.phone2,
    email: contact.email ?? row.email,
    nic: contact.nic ?? row.nic,
    street_address: contact.street_address ?? row.street_address,
    street_address_2: contact.street_address_2 ?? row.street_address_2,
    city: contact.city ?? row.city,
    postal_code: contact.postal_code ?? row.postal_code,
    address: contact.address ?? row.address,
    notes: contact.notes ?? row.notes,
    is_active: contact.is_active ?? row.is_active,
    nic_front_url: contact.nic_front_url ?? row.nic_front_url,
    nic_back_url: contact.nic_back_url ?? row.nic_back_url,
    photo_url: contact.photo_url ?? row.photo_url,
    utility_bill_url: contact.utility_bill_url ?? row.utility_bill_url,
    created_at: contact.created_at ?? row.created_at,
    updated_at: contact.updated_at ?? row.updated_at,
    contact: contact,
    contact_id: contact.id ?? row.contact_id,
  };
  return result as unknown as T;
}
