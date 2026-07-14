import { cookies } from 'next/headers';
import { SessionUser } from '@/types';
import { supabaseAdmin } from '@/lib/supabase';

const SESSION_COOKIE = 'cz_session';

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;
  
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const session = JSON.parse(decoded) as SessionUser;
    const { data } = await supabaseAdmin.from('users').select('token_version').eq('id', session.id).single();
    if (!data) return null;
    if (data.token_version !== (session.token_version ?? 0)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}

export function createSessionToken(user: SessionUser): string {
  const json = JSON.stringify(user);
  return Buffer.from(json).toString('base64');
}

export function isAdmin(session: SessionUser): boolean {
  return session.role === 'admin';
}
