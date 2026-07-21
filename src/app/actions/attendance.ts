'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/auth';
import { ATTENDANCE_TAG } from '@/lib/cache-tags';

// ==========================================
// 1. TYPES (Added the missing Types here)
// ==========================================
export type AttendanceStatus = 'On Time' | 'Late' | 'Absent';

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string | null;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  working_hours: string | null;
  created_at: string;
};

export type AttendanceSummary = {
  present: number;
  late: number;
  absent: number;
  working: number;
  totalEmployees: number;
};

export type AttendanceReportRow = {
  employee_id: string;
  employee_name: string;
  employee_email: string | null;
  total: number;
  present: number;
  late: number;
  absent: number;
  working: number;
};

type AttendanceFilters = {
  search?: string;
  status?: AttendanceStatus | 'all';
  date?: string;
  page?: number;
  pageSize?: number;
};

type AttendanceDashboardData = {
  isAdmin: boolean;
  summary: AttendanceSummary;
  records: AttendanceRecord[];
  totalRecords: number;
  todayRecords: AttendanceRecord[];
  employees: Array<{ id: string; full_name: string; email?: string | null }>;
  reportRows: AttendanceReportRow[];
  currentUser: any;
};


// ==========================================
// 2. HELPER FUNCTIONS (Added the missing Functions)
// ==========================================
function getColomboDateKey(date = new Date()) {
  return new Date(date.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
}

function getColomboDayRange(dateString: string) {
  const start = new Date(dateString + 'T00:00:00+05:30');
  const end = new Date(dateString + 'T23:59:59.999+05:30');
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function isLateCheckIn(date: Date) {
  const slTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  const hours = slTime.getUTCHours();
  const minutes = slTime.getUTCMinutes();
  // Late if after 09:00 AM
  return hours > 9 || (hours === 9 && minutes > 0);
}

function calculateWorkingHours(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

function normalizeAttendanceStatus(status: string): AttendanceStatus {
  if (status === 'Late') return 'Late';
  if (status === 'Absent') return 'Absent';
  return 'On Time';
}

function datetimeLocalToIso(dt: string) {
  return new Date(dt).toISOString();
}


// ==========================================
// 3. MAIN LOGIC (Your previous code)
// ==========================================

function buildSummary(records: AttendanceRecord[], totalEmployees: number): AttendanceSummary {
  const presentEmployees = new Set<string>();
  let late = 0;
  let working = 0;

  for (const record of records) {
    if (record.status === 'Absent') continue;
    presentEmployees.add(record.employee_id);
    if (record.status === 'Late') late += 1;
    if (record.check_in && !record.check_out) working += 1;
  }

  return {
    present: presentEmployees.size,
    late,
    absent: Math.max(0, totalEmployees - presentEmployees.size),
    working,
    totalEmployees,
  };
}

function buildReports(records: AttendanceRecord[], employees: Array<{ id: string; full_name: string; email?: string | null }>): AttendanceReportRow[] {
  const reportMap = new Map<string, AttendanceReportRow>();

  for (const employee of employees) {
    reportMap.set(employee.id, {
      employee_id: employee.id,
      employee_name: employee.full_name,
      employee_email: employee.email ?? null,
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      working: 0,
    });
  }

  for (const record of records) {
    const current = reportMap.get(record.employee_id) ?? {
      employee_id: record.employee_id,
      employee_name: record.employee_name,
      employee_email: record.employee_email ?? null,
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      working: 0,
    };

    current.total += 1;
    if (record.status === 'Absent') current.absent += 1;
    else {
      current.present += 1;
      if (record.status === 'Late') current.late += 1;
      if (record.check_in && !record.check_out) current.working += 1;
    }

    reportMap.set(record.employee_id, current);
  }

  return Array.from(reportMap.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}

async function fetchAttendanceRecords(session: any, filters?: AttendanceFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;

  let query = supabaseAdmin
    .from('attendance')
    .select('id, employee_id, employee_name, employee_email, check_in, check_out, status, working_hours, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (session.role !== 'admin') {
    query = query.eq('employee_id', session.id);
  }

  if (filters?.date) {
    const { startIso, endIso } = getColomboDayRange(filters.date);
    query = query.gte('created_at', startIso).lt('created_at', endIso);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.search?.trim()) {
    const term = filters.search.trim();
    query = query.or(`employee_name.ilike.%${term}%,employee_email.ilike.%${term}%`);
  }

  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { records: (data ?? []) as AttendanceRecord[], count: count ?? 0 };
}

async function fetchTodayRecords(session: any) {
  const { startIso, endIso } = getColomboDayRange(getColomboDateKey());
  let query = supabaseAdmin
    .from('attendance')
    .select('id, employee_id, employee_name, employee_email, check_in, check_out, status, working_hours, created_at')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: false });

  if (session.role !== 'admin') {
    query = query.eq('employee_id', session.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AttendanceRecord[];
}

async function fetchEmployees() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, is_active, role')
    .eq('role', 'employee')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((user) => ({ id: user.id, full_name: user.full_name, email: user.email ?? null }));
}

async function _fetchAttendanceDashboardData(filters?: AttendanceFilters): Promise<AttendanceDashboardData> {
  const currentUser = await requireAuth();
  const isAdmin = currentUser.role === 'admin';
  const employees = isAdmin ? await fetchEmployees() : [{ id: currentUser.id, full_name: currentUser.full_name, email: currentUser.email ?? null }];
  const { records, count: totalRecords } = await fetchAttendanceRecords(currentUser, filters);
  const todayRecords = await fetchTodayRecords(currentUser);
  const summary = buildSummary(todayRecords, isAdmin ? employees.length : 1);
  const reportRows = buildReports(records, employees);

  return { isAdmin, summary, records, totalRecords, todayRecords, employees, reportRows, currentUser };
}

const _cachedGetAttendanceDashboardData = unstable_cache(
  _fetchAttendanceDashboardData,
  ['attendance-dashboard'],
  { tags: [ATTENDANCE_TAG], revalidate: false },
);

export async function getAttendanceDashboardData(filters?: AttendanceFilters): Promise<AttendanceDashboardData> {
  await requireAuth();
  return _cachedGetAttendanceDashboardData(filters);
}

export async function checkInAttendance() {
  const session = await requireAuth();
  const now = new Date();
  const { startIso, endIso } = getColomboDayRange(getColomboDateKey(now));

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('attendance')
    .select('id, check_in, status')
    .eq('employee_id', session.id)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  if (existing?.check_in && existing.status !== 'Absent') {
    return { error: 'You have already checked in today.' };
  }

  const payload = {
    employee_id: session.id,
    employee_name: session.full_name,
    employee_email: session.email ?? null,
    check_in: now.toISOString(),
    check_out: null,
    status: isLateCheckIn(now) ? 'Late' : 'On Time',
    working_hours: null,
    created_at: now.toISOString(),
  };

  if (existing?.status === 'Absent') {
    const { error } = await supabaseAdmin.from('attendance').update(payload).eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabaseAdmin.from('attendance').insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath('/dashboard/attendance');
  revalidateTag(ATTENDANCE_TAG);
  return { success: true };
}

export async function checkOutAttendance() {
  const session = await requireAuth();
  const now = new Date();
  const { startIso, endIso } = getColomboDayRange(getColomboDateKey(now));

  const { data: existing, error: selectError } = await supabaseAdmin
    .from('attendance')
    .select('id, check_in, check_out, status')
    .eq('employee_id', session.id)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (!existing?.check_in) return { error: 'Please check in before checking out.' };
  if (existing?.check_out) return { error: 'You have already checked out today.' };

  const { error } = await supabaseAdmin
    .from('attendance')
    .update({
      check_out: now.toISOString(),
      working_hours: calculateWorkingHours(existing.check_in, now.toISOString()),
    })
    .eq('id', existing.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/attendance');
  revalidateTag(ATTENDANCE_TAG);
  return { success: true };
}

export async function updateAttendance(id: string, data: { check_in?: string | null; check_out?: string | null; status: AttendanceStatus }) {
  await requireAdmin();

  const nextStatus = normalizeAttendanceStatus(data.status);
  const nextCheckIn = nextStatus === 'Absent' ? null : (data.check_in ? datetimeLocalToIso(data.check_in) : null);
  const nextCheckOut = nextStatus === 'Absent' ? null : (data.check_out ? datetimeLocalToIso(data.check_out) : null);
  const workingHours = nextCheckIn && nextCheckOut ? calculateWorkingHours(nextCheckIn, nextCheckOut) : null;

  const { error } = await supabaseAdmin
    .from('attendance')
    .update({
      check_in: nextCheckIn,
      check_out: nextCheckOut,
      status: nextStatus,
      working_hours: workingHours,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/attendance');
  revalidateTag(ATTENDANCE_TAG);
  return { success: true };
}

export async function clearAttendanceEntry(id: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from('attendance')
    .update({
      check_in: null,
      check_out: null,
      status: 'Absent',
      working_hours: null,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/attendance');
  revalidateTag(ATTENDANCE_TAG);
  return { success: true };
}

export async function deleteAttendance(id: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from('attendance').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/attendance');
  revalidateTag(ATTENDANCE_TAG);
  return { success: true };
}

export async function clearAllAttendance() {
  await requireAdmin();

  const { error } = await supabaseAdmin.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) return { error: error.message };

  revalidatePath('/dashboard/attendance');
  revalidateTag(ATTENDANCE_TAG);
  return { success: true };
}

export async function markAbsentAttendance(targetDate = getColomboDateKey()) {
  const { startIso, endIso } = getColomboDayRange(targetDate);

  const [{ data: employees, error: employeeError }, { data: attendanceRows, error: attendanceError }] = await Promise.all([
    supabaseAdmin.from('users').select('id, full_name, email').eq('role', 'employee').eq('is_active', true),
    supabaseAdmin.from('attendance').select('employee_id').gte('created_at', startIso).lt('created_at', endIso),
  ]);

  if (employeeError) throw new Error(employeeError.message);
  if (attendanceError) throw new Error(attendanceError.message);

  const existingEmployeeIds = new Set((attendanceRows ?? []).map((row) => row.employee_id));
  const absentEmployees = (employees ?? []).filter((employee) => !existingEmployeeIds.has(employee.id));

  if (absentEmployees.length === 0) return { inserted: 0 };

  const now = new Date();
  const payload = absentEmployees.map((employee) => ({
    employee_id: employee.id,
    employee_name: employee.full_name,
    employee_email: employee.email ?? null,
    check_in: null,
    check_out: null,
    status: 'Absent',
    working_hours: null,
    created_at: now.toISOString(),
  }));

  const { error } = await supabaseAdmin.from('attendance').insert(payload);
  if (error && !String(error.message).toLowerCase().includes('duplicate')) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/attendance');
  revalidateTag(ATTENDANCE_TAG);
  return { inserted: payload.length };
}