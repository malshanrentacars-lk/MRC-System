'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { DashboardStats, TopVehicle, TopCustomer } from '@/types';
import { unstable_cache } from 'next/cache';
import { DASHBOARD_TAG } from '@/lib/cache-tags';

async function fetchDashboardStats(): Promise<DashboardStats> {
  const today = new Date().toISOString().substring(0, 10);

  const [
    availableRes,
    bookedRes,
    inGarageRes,
    totalVehiclesRes,
    activeRentalsRes,
    overdueRentalsRes,
    completedTodayRes,
    todayRevenueRes,
    totalDepositRes,
  ] = await Promise.all([
    supabaseAdmin.from('vehicles').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('status', 'available'),
    supabaseAdmin.from('vehicles').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('status', 'booked'),
    supabaseAdmin.from('vehicles').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('status', 'in_garage'),
    supabaseAdmin.from('vehicles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('rentals').select('*', { count: 'exact', head: true }).in('status', ['active', 'overdue']).lt('end_date', today),
    supabaseAdmin.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'returned').eq('end_date', today),
    supabaseAdmin.from('rentals').select('total_amount').gte('created_at', today),
    supabaseAdmin.from('rentals').select('deposit').in('status', ['active', 'booked']).gt('deposit', 0),
  ]);

  const todayRevenue = (todayRevenueRes.data ?? []).reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
  const totalDeposit = (totalDepositRes.data ?? []).reduce((sum, r) => sum + (r.deposit ?? 0), 0);

  return {
    activeRentals: activeRentalsRes.count ?? 0,
    availableVehicles: availableRes.count ?? 0,
    bookedVehicles: bookedRes.count ?? 0,
    inGarageVehicles: inGarageRes.count ?? 0,
    totalVehicles: totalVehiclesRes.count ?? 0,
    todayRevenue,
    totalDeposit,
    overdueRentals: overdueRentalsRes.count ?? 0,
    completedToday: completedTodayRes.count ?? 0,
  };
}

const cachedDashboardStats = unstable_cache(
  fetchDashboardStats,
  ['dashboard-stats'],
  { tags: [DASHBOARD_TAG], revalidate: false },
);

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAuth();
  return cachedDashboardStats();
}

async function fetchTopVehicles(limit = 10): Promise<TopVehicle[]> {
  const { data } = await supabaseAdmin.rpc('get_top_vehicles', { limit_count: limit });
  if (!data) return [];

  return (data as Array<{
    vehicle_id: string;
    reg_number: string;
    brand: string;
    model: string;
    rental_count: number;
    total_revenue: number;
  }>).map((r) => ({
    vehicle_id: r.vehicle_id,
    reg_number: r.reg_number,
    brand: r.brand,
    model: r.model,
    rental_count: Number(r.rental_count),
    total_revenue: Number(r.total_revenue),
  }));
}

const cachedTopVehicles = unstable_cache(
  fetchTopVehicles,
  ['top-vehicles'],
  { tags: [DASHBOARD_TAG], revalidate: false },
);

export async function getTopVehicles(limit = 10): Promise<TopVehicle[]> {
  await requireAuth();
  return cachedTopVehicles(limit);
}

async function fetchTopCustomers(limit = 10): Promise<TopCustomer[]> {
  const { data } = await supabaseAdmin.rpc('get_top_customers', { limit_count: limit });
  if (!data) return [];

  return (data as Array<{
    customer_id: string;
    name: string;
    phone: string;
    rental_count: number;
    total_spent: number;
  }>).map((r) => ({
    customer_id: r.customer_id,
    name: r.name,
    phone: r.phone,
    rental_count: Number(r.rental_count),
    total_spent: Number(r.total_spent),
  }));
}

const cachedTopCustomers = unstable_cache(
  fetchTopCustomers,
  ['top-customers'],
  { tags: [DASHBOARD_TAG], revalidate: false },
);

export async function getTopCustomers(limit = 10): Promise<TopCustomer[]> {
  await requireAuth();
  return cachedTopCustomers(limit);
}

async function fetchUpcomingRentals() {
  const today = new Date().toISOString().substring(0, 10);
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10);

  const { data } = await supabaseAdmin
    .from('rentals')
    .select('id, rental_number, start_date, end_date, status, customers!inner(id, contact_id, contact:contacts(name)), vehicles(reg_number, brand, model)')
    .in('status', ['active', 'booked'])
    .lte('end_date', in7days)
    .order('end_date', { ascending: true });

  return (data ?? []).map(r => ({
    ...r,
    customers: (() => {
      const c = r.customers as { contact?: { name?: string } } | Array<{ contact?: { name?: string } }> | null;
      if (Array.isArray(c)) return c.map(cc => ({ name: cc?.contact?.name ?? 'Unknown' }));
      return { name: c?.contact?.name ?? 'Unknown' };
    })(),
  }));
}

const cachedUpcomingRentals = unstable_cache(
  fetchUpcomingRentals,
  ['upcoming-rentals'],
  { tags: [DASHBOARD_TAG], revalidate: false },
);

export async function getUpcomingRentals() {
  await requireAuth();
  return cachedUpcomingRentals();
}

async function fetchCalendarEvents() {
  const { data: rentals } = await supabaseAdmin
    .from('rentals')
    .select('id, rental_number, start_date, end_date, status, customers!inner(id, contact_id, contact:contacts(name)), vehicles(reg_number)')
    .in('status', ['active', 'booked'])
    .order('start_date', { ascending: true })
    .limit(200);

  const { data: vehicles } = await supabaseAdmin
    .from('vehicles')
    .select('id, reg_number, brand, model, next_service_date, next_service_km, current_km, status')
    .eq('is_active', true)
    .limit(200);

  const flatRentals = (rentals ?? []).map(r => ({
    id: r.id,
    rental_number: r.rental_number,
    start_date: r.start_date,
    end_date: r.end_date,
    status: r.status,
    customers: (() => {
      const c = r.customers as { contact?: { name?: string } } | Array<{ contact?: { name?: string } }> | null;
      if (Array.isArray(c)) return c.map(cc => ({ name: cc?.contact?.name ?? 'Unknown' }));
      return { name: c?.contact?.name ?? 'Unknown' };
    })(),
    vehicles: r.vehicles as unknown,
  }));

  return { rentals: flatRentals, vehicles: vehicles ?? [] };
}

const cachedCalendarEvents = unstable_cache(
  fetchCalendarEvents,
  ['calendar-events'],
  { tags: [DASHBOARD_TAG], revalidate: false },
);

export async function getCalendarEvents() {
  await requireAuth();
  return cachedCalendarEvents();
}
