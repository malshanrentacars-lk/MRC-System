import { clsx, type ClassValue } from 'clsx';
import { RateTier } from '@/types';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateParts(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'LKR'): string {
  return `${currency} ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '—';
  try {
    return formatDateParts(new Date(date));
  } catch {
    return '—';
  }
}

export function formatDateShort(date: string | Date | undefined | null): string {
  if (!date) return '—';
  try {
    const value = new Date(date);
    return value.toISOString().slice(0, 10);
  } catch {
    return '—';
  }
}

export function daysBetween(start: string | Date, end: string | Date): number {
  const startDay = startOfDay(new Date(start));
  const endDay = startOfDay(new Date(end));
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((endDay.getTime() - startDay.getTime()) / msPerDay);
}

export function isOverdue(endDate: string): boolean {
  const date = startOfDay(new Date(endDate));
  const today = startOfDay(new Date());
  return date < today;
}

export function isDueToday(date: string): boolean {
  const target = startOfDay(new Date(date));
  const today = startOfDay(new Date());
  return target.getTime() === today.getTime();
}

export function isDueSoon(date: string, days = 3): boolean {
  const target = new Date(date);
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  return target <= soon && !isOverdue(date);
}

export function calculateRentalAmount(
  startDate: string,
  endDate: string,
  dailyRate: number,
  rateTiers?: RateTier[]
): { days: number; rateUsed: number; subtotal: number } {
  const days = daysBetween(startDate, endDate);
  
  let rateUsed = dailyRate;
  
  if (rateTiers && rateTiers.length > 0) {
    // Find applicable tier
    const sortedTiers = [...rateTiers].sort((a, b) => a.days_from - b.days_from);
    for (const tier of sortedTiers) {
      if (days >= tier.days_from && (tier.days_to === null || tier.days_to === undefined || days <= tier.days_to)) {
        rateUsed = tier.rate_per_day;
        break;
      }
    }
  }
  
  return { days, rateUsed, subtotal: days * rateUsed };
}

export function isServiceDue(vehicle: { current_km: number; next_service_km: number; next_service_date?: string | null }): boolean {
  if (vehicle.current_km >= vehicle.next_service_km) return true;
  if (vehicle.next_service_date && isOverdue(vehicle.next_service_date)) return true;
  return false;
}

export function isServiceSoon(vehicle: { current_km: number; next_service_km: number; next_service_date?: string | null }, kmThreshold = 500, dayThreshold = 7): boolean {
  if (vehicle.current_km >= vehicle.next_service_km - kmThreshold) return true;
  if (vehicle.next_service_date && isDueSoon(vehicle.next_service_date, dayThreshold)) return true;
  return false;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    available: 'badge-available',
    rented: 'badge-rented',
    active: 'badge-active',
    paused: 'badge-in-garage',
    booked: 'badge-booked',
    in_garage: 'badge-in-garage',
    returned: 'badge-returned',
    completed: 'badge-returned',
    extended: 'badge-booked',
    swapped: 'badge-rented',
    overdue: 'badge-overdue',
    cancelled: 'badge-cancelled',
  };
  return map[status] ?? 'badge-returned';
}

export function getStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function truncate(text: string, length = 30): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}
