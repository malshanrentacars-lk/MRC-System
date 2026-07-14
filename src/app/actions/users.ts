'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin, requireAuth, getSession, createSessionToken } from '@/lib/auth';
import { logActivity } from '@/app/actions/activity';
import { buildDiff } from '@/lib/diff';
import { readAddressForm } from '@/lib/address';
import { USERS_TAG, TODOS_TAG, SETTINGS_TAG } from '@/lib/cache-tags';
import bcrypt from 'bcryptjs';

const USER_FIELDS: Record<string, string> = {
  full_name: 'Full Name', email: 'Email', role: 'Role', avatar_url: 'Avatar',
};

async function _fetchUsers() {
  const { data, error } = await supabaseAdmin.from('users').select('id, username, full_name, email, avatar_url, role, is_active, created_at').order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

const _cachedGetUsers = unstable_cache(
  _fetchUsers,
  ['users-list'],
  { tags: [USERS_TAG], revalidate: false },
);

export async function getUsers() {
  await requireAuth();
  return _cachedGetUsers();
}

async function _fetchUserById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, full_name, email, avatar_url, role, is_active, created_at")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

const _cachedGetUserById = unstable_cache(
  _fetchUserById,
  ['user-by-id'],
  { tags: [USERS_TAG], revalidate: false },
);

export async function getUserById(id: string) {
  await requireAuth();
  return _cachedGetUserById(id);
}

export async function getMyAvatar(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabaseAdmin.from('users').select('avatar_url').eq('id', session.id).single();
  return data?.avatar_url ?? null;
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const password = formData.get('password') as string;
  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabaseAdmin.from('users').insert({
    username: (formData.get('username') as string).toLowerCase().trim(),
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string || null,
    password_hash: hash,
    role: formData.get('role') as string || 'employee',
  }).select('id, username, full_name, email, avatar_url, role, is_active, created_at').single();

  if (error) return { error: error.message };
  revalidatePath('/users');
  revalidateTag(USERS_TAG);
  await logActivity({ action: 'created', module: 'Users', entity_id: data.id, entity_label: `${data.full_name} (@${data.username})`, details: `Role: ${data.role}` });
  return { data };
}

export async function updateUser(id: string, formData: FormData) {
  const session = await requireAuth();
  const isSelf = session.id === id;

  if (!isSelf && session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }

  // Fetch current before update for diff
  const { data: current } = await supabaseAdmin.from('users').select('full_name, email, role, avatar_url').eq('id', id).single();

  const updates: Record<string, unknown> = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string || null,
  };

  // Only admins can change roles
  if (session.role === 'admin') {
    updates.role = formData.get('role') as string;
  }

  const avatarUrl = formData.get('avatar_url') as string;
  if (avatarUrl !== undefined && avatarUrl !== '') {
    updates.avatar_url = avatarUrl || null;
  }

  const newPassword = formData.get('password') as string;
  if (newPassword) {
    updates.password_hash = await bcrypt.hash(newPassword, 10);
  }

  const { error } = await supabaseAdmin.from('users').update(updates).eq('id', id);
  if (error) return { error: error.message };

  // Sync session if modifying own profile
  if (isSelf) {
    const newSession = { ...session, full_name: updates.full_name as string, avatar_url: (updates.avatar_url as string) || session.avatar_url };
    const cookieStore = await cookies();
    cookieStore.set('cz_session', createSessionToken(newSession), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7
    });
    revalidatePath('/', 'layout');
  }

  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
  revalidateTag(USERS_TAG);
  const diff = current ? buildDiff(current as Record<string, unknown>, updates, USER_FIELDS) : { details: '', old_value: '', new_value: '' };
  await logActivity({ action: 'updated', module: 'Users', entity_id: id, entity_label: updates.full_name as string, ...diff });
  return { success: true };
}

export async function toggleUserActive(id: string, isActive: boolean) {
  await requireAdmin();
  const { data: u } = await supabaseAdmin.from('users').select('full_name, username').eq('id', id).single();
  await supabaseAdmin.from('users').update({ is_active: isActive }).eq('id', id);
  await logActivity({ action: isActive ? 'activated' : 'deactivated', module: 'Users', entity_id: id, entity_label: u ? `${u.full_name} (@${u.username})` : id });
  revalidatePath('/users');
  revalidateTag(USERS_TAG);
  return { success: true };
}

// Todo actions
async function _fetchTodos() {
  const { data } = await supabaseAdmin.from('todos').select('*').order('due_date', { ascending: true, nullsFirst: false });
  return data ?? [];
}

const _cachedGetTodos = unstable_cache(
  _fetchTodos,
  ['todos-list'],
  { tags: [TODOS_TAG], revalidate: false },
);

export async function getTodos() {
  await requireAuth();
  return _cachedGetTodos();
}

export async function createTodo(title: string, dueDate?: string, description?: string) {
  const session = await requireAuth();
  const { data, error } = await supabaseAdmin.from('todos').insert({
    title,
    description: description ?? null,
    due_date: dueDate ?? null,
    type: 'custom',
    created_by: session.id,
  }).select().single();
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidateTag(TODOS_TAG);
  return { data };
}

export async function toggleTodo(id: string, isDone: boolean) {
  await requireAuth();
  await supabaseAdmin.from('todos').update({ is_done: isDone }).eq('id', id);
  revalidatePath('/dashboard');
  revalidateTag(TODOS_TAG);
  return { success: true };
}

export async function deleteTodo(id: string) {
  await requireAuth();
  await supabaseAdmin.from('todos').delete().eq('id', id);
  revalidatePath('/dashboard');
  revalidateTag(TODOS_TAG);
  return { success: true };
}

// Company settings
async function _fetchCompanySettings() {
  const { data } = await supabaseAdmin.from('company_settings').select('*').single();
  return data;
}

const _cachedGetCompanySettings = unstable_cache(
  _fetchCompanySettings,
  ['company-settings'],
  { tags: [SETTINGS_TAG], revalidate: false },
);

export async function getCompanySettings() {
  await requireAuth();
  return _cachedGetCompanySettings();
}

export async function updateCompanySettings(formData: FormData) {
  await requireAdmin();

  const { data: existing } = await supabaseAdmin.from('company_settings').select('id').single();
  const address = readAddressForm(formData);

  const payload = {
    company_name: formData.get('company_name') as string,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    ...address,
    service_interval_km: parseInt(formData.get('service_interval_km') as string) || 5000,
  };

  if (existing) {
    const { error } = await supabaseAdmin.from('company_settings').update(payload).eq('id', existing.id);
    if (error) console.warn('Failed to update company settings:', error.message);
  } else {
    const { error } = await supabaseAdmin.from('company_settings').insert(payload);
    if (error) console.warn('Failed to create company settings:', error.message);
  }

  revalidatePath('/settings');
  revalidateTag(SETTINGS_TAG);
  await logActivity({ action: 'updated', module: 'Settings', entity_label: payload.company_name, details: 'Company settings updated' });
  return { success: true };
}
