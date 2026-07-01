'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin, requireAuth, getSession, createSessionToken } from '@/lib/auth';
import { logActivity } from '@/app/actions/activity';
import { buildDiff } from '@/lib/diff';
import { readAddressForm } from '@/lib/address';
import bcrypt from 'bcryptjs';

const USER_FIELDS: Record<string, string> = {
  full_name: 'Full Name', email: 'Email', role: 'Role',
};

export async function getUsers() {
  await requireAuth();
  const { data, error } = await supabaseAdmin.from('users').select('id, username, full_name, email, role, is_active, created_at').order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
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
  }).select('id, username, full_name, email, role, is_active, created_at').single();

  if (error) return { error: error.message };
  revalidatePath('/users');
  await logActivity({ action: 'created', module: 'Users', entity_id: data.id, entity_label: `${data.full_name} (@${data.username})`, details: `Role: ${data.role}` });
  return { data };
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin();

  // Fetch current before update for diff
  const { data: current } = await supabaseAdmin.from('users').select('full_name, email, role').eq('id', id).single();

  const updates: Record<string, unknown> = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string || null,
    role: formData.get('role') as string,
  };

  const newPassword = formData.get('password') as string;
  if (newPassword) {
    updates.password_hash = await bcrypt.hash(newPassword, 10);
  }

  const { error } = await supabaseAdmin.from('users').update(updates).eq('id', id);
  if (error) return { error: error.message };

  // Sync session name if modifying own profile
  const session = await getSession();
  if (session && session.id === id) {
    const newSession = { ...session, full_name: updates.full_name as string, role: updates.role as any };
    const cookieStore = await cookies();
    cookieStore.set('cz_session', createSessionToken(newSession), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7
    });
    // Revalidate the whole layout so sidebar / header picks up new name
    revalidatePath('/', 'layout');
  }

  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
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
  return { success: true };
}

// Todo actions
export async function getTodos() {
  await requireAuth();
  const { data } = await supabaseAdmin.from('todos').select('*').order('due_date', { ascending: true, nullsFirst: false });
  return data ?? [];
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
  return { data };
}

export async function toggleTodo(id: string, isDone: boolean) {
  await requireAuth();
  await supabaseAdmin.from('todos').update({ is_done: isDone }).eq('id', id);
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteTodo(id: string) {
  await requireAuth();
  await supabaseAdmin.from('todos').delete().eq('id', id);
  revalidatePath('/dashboard');
  return { success: true };
}

// Company settings
export async function getCompanySettings() {
  await requireAuth();
  const { data } = await supabaseAdmin.from('company_settings').select('*').single();
  return data;
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
    if (error && error.message.includes('column') && error.message.includes('schema cache')) {
      const { company_name, address, phone, email, service_interval_km } = payload as any;
      await supabaseAdmin.from('company_settings')
        .update({ company_name, address, phone, email, service_interval_km })
        .eq('id', existing.id);
    }
  } else {
    const { error } = await supabaseAdmin.from('company_settings').insert(payload);
    if (error && error.message.includes('column') && error.message.includes('schema cache')) {
      const { company_name, address, phone, email, service_interval_km } = payload as any;
      await supabaseAdmin.from('company_settings')
        .insert({ company_name, address, phone, email, service_interval_km });
    }
  }

  revalidatePath('/settings');
  await logActivity({ action: 'updated', module: 'Settings', entity_label: payload.company_name, details: 'Company settings updated' });
  return { success: true };
}
