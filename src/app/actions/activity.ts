'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface ActivityLogParams {
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated' | 'returned' | 'cancelled' | 'uploaded' | 'login' | 'status_changed' | 'exchanged';
  module: 'Vehicles' | 'Customers' | 'Suppliers' | 'Guarantors' | 'Rentals' | 'Users' | 'Settings' | 'Inspections' | 'Companies';
  entity_id?: string;
  entity_label?: string;
  details?: string;
  old_value?: string;
  new_value?: string;
}

/**
 * Log a user activity. Silent — never throws.
 * Tries full insert with old_value/new_value first.
 * Falls back to insert without those columns if they don't exist yet (migration pending).
 */
export async function logActivity(params: ActivityLogParams) {
  try {
    const session = await getSession();
    if (!session) return;

    const base = {
      user_id: session.id,
      user_name: session.full_name || session.username || 'Unknown',
      user_role: session.role || 'employee',
      action: params.action,
      module: params.module,
      entity_id: params.entity_id ?? null,
      entity_label: params.entity_label ?? null,
      details: params.details ?? null,
    };

    // Try full insert (with old_value / new_value columns)
    const { error } = await supabaseAdmin.from('activity_logs').insert({
      ...base,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
    });

    if (error) {
      // Fall back to insert without diff columns (migration not yet run)
      await supabaseAdmin.from('activity_logs').insert(base);
    }
  } catch {
    // Silent — never let logging break the main action
  }
}

export async function getActivityLogs(params?: {
  userId?: string;
  module?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;

  let query = supabaseAdmin
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (session.role !== 'admin') {
    query = query.eq('user_id', session.id);
  } else if (params?.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params?.module && params.module !== 'all') {
    query = query.eq('module', params.module);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: data ?? [], count: count ?? 0 };
}

export async function clearActivityLogs(olderThanDays?: number) {
  if (olderThanDays) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('activity_logs').delete().lt('created_at', cutoff);
  } else {
    await supabaseAdmin.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
  revalidatePath('/users');
  return { success: true };
}

export async function logActivities(entries: ActivityLogParams[]) {
  try {
    const session = await getSession();
    if (!session || entries.length === 0) return;

    const rows = entries.map(params => ({
      user_id: session.id,
      user_name: session.full_name || session.username || 'Unknown',
      user_role: session.role || 'employee',
      action: params.action,
      module: params.module,
      entity_id: params.entity_id ?? null,
      entity_label: params.entity_label ?? null,
      details: params.details ?? null,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
    }));

    const { error } = await supabaseAdmin.from('activity_logs').insert(rows);
    if (error) {
      const baseRows = rows.map(({ old_value, new_value, ...rest }) => rest);
      await supabaseAdmin.from('activity_logs').insert(baseRows);
    }
  } catch {
    // Silent
  }
}
