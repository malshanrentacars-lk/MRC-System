'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { createSessionToken, getSession } from '@/lib/auth';
import { SessionUser } from '@/types';
import { logActivity } from '@/app/actions/activity';

const SESSION_COOKIE = 'cz_session';

export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  if (!isSupabaseConfigured) {
    return {
      error: 'Authentication is not configured on this deployment. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in Vercel.',
    };
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, username, full_name, email, password_hash, role, is_active')
    .eq('username', username.trim().toLowerCase())
    .single();

  if (error || !user) {
    return { error: 'Invalid username or password' };
  }

  if (!user.is_active) {
    return { error: 'Your account has been deactivated. Contact admin.' };
  }

  // Verify password
  // Note: The seed uses a placeholder hash. For production, hash 'Admin@1234' properly.
  // We'll also try direct comparison for development ease.
  let passwordMatch = false;
  try {
    passwordMatch = await bcrypt.compare(password, user.password_hash);
  } catch {
    // Fallback for development seed
    passwordMatch = false;
  }

  // Development fallback: allow direct match for seed user
  if (!passwordMatch && process.env.NODE_ENV === 'development') {
    if (username === 'amil' && password === 'Admin@1234') {
      passwordMatch = true;
    }
  }

  if (!passwordMatch) {
    return { error: 'Invalid username or password' };
  }

  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    email: user.email,
  };

  const token = createSessionToken(sessionUser);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  // Log the login — write directly since session cookie not yet readable by getSession()
  try {
    await supabaseAdmin.from('activity_logs').insert({
      user_id: sessionUser.id,
      user_name: sessionUser.full_name || sessionUser.username,
      user_role: sessionUser.role,
      action: 'login',
      module: 'Users',
      entity_label: sessionUser.username,
      details: 'Logged in',
    });
  } catch { /* silent */ }

  redirect('/dashboard');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}

export async function verifyPasswordAction(password: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('password_hash')
    .eq('id', session.id)
    .single();

  if (!user) return false;

  try {
    const match = await bcrypt.compare(password, user.password_hash);
    if (match) return true;
  } catch {
    // fallback
  }

  // Dev fallback
  if (process.env.NODE_ENV === 'development' && password === 'Admin@1234') return true;
  
  return false;
}
