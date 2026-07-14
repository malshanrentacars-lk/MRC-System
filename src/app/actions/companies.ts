'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { logActivity } from '@/app/actions/activity';
import { readAddressForm } from '@/lib/address';
import { COMPANIES_TAG } from '@/lib/cache-tags';

function buildCompanyPayload(formData: FormData) {
  const logo_url = (formData.get('logo_url') as string) || null;
  const logo_path = (formData.get('logo_path') as string) || null;
  const address = readAddressForm(formData);

  return {
    name: formData.get('name') as string,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    ...address,
    notes: formData.get('notes') as string || null,
    logo_url,
    logo_path,
  };
}

export async function createCompany(formData: FormData) {
  await requireAuth();

  const payload = buildCompanyPayload(formData);
  const { data, error } = await supabaseAdmin.from('companies').insert(payload).select().single();
  if (error) return { error: error.message };

  revalidatePath('/companies');
  revalidateTag(COMPANIES_TAG);
  await logActivity({ action: 'created', module: 'Companies', entity_id: data.id, entity_label: data.name });
  return { data };
}

async function _fetchCompanies(params?: { search?: string; page?: number; pageSize?: number }) {
  let query = supabaseAdmin
    .from('companies')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data ?? [], count: count ?? 0 };
}

const _cachedGetCompanies = unstable_cache(
  _fetchCompanies,
  ['companies-list'],
  { tags: [COMPANIES_TAG], revalidate: false },
);

export async function getCompanies(params?: { search?: string; page?: number; pageSize?: number }) {
  await requireAuth();
  return _cachedGetCompanies(params);
}

export async function deleteCompany(id: string) {
  await requireAuth();
  const { data: c } = await supabaseAdmin.from('companies').select('name').eq('id', id).single();
  const { error } = await supabaseAdmin.from('companies').delete().eq('id', id);
  if (error) return { error: error.message };
  await logActivity({ action: 'deleted', module: 'Companies', entity_id: id, entity_label: c?.name ?? id });
  revalidatePath('/companies');
  revalidateTag(COMPANIES_TAG);
  return { success: true };
}

async function _fetchCompanyById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

const _cachedGetCompanyById = unstable_cache(
  _fetchCompanyById,
  ['company-by-id'],
  { tags: [COMPANIES_TAG], revalidate: false },
);

export async function getCompanyById(id: string) {
  await requireAuth();
  return _cachedGetCompanyById(id);
}
