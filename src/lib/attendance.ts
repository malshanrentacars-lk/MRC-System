import type { AttendanceStatus } from "@/types";

const COLOMBO_OFFSET_MINUTES = 330;
const COLOMBO_OFFSET_MS = COLOMBO_OFFSET_MINUTES * 60 * 1000;

function shiftToColombo(date = new Date()) {
  return new Date(date.getTime() + COLOMBO_OFFSET_MS);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getColomboDateKey(date = new Date()): string {
  const shifted = shiftToColombo(date);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function getColomboDayRange(dateKey = getColomboDateKey()) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const startUtc = Date.UTC(year, month - 1, day, 0, 0, 0) - COLOMBO_OFFSET_MS;
  const endUtc = startUtc + 24 * 60 * 60 * 1000;

  return {
    startIso: new Date(startUtc).toISOString(),
    endIso: new Date(endUtc).toISOString(),
  };
}

export function isLateCheckIn(date = new Date()): boolean {
  const shifted = shiftToColombo(date);
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return hour > 9 || (hour === 9 && minute > 0);
}

export function calculateWorkingHours(checkIn: string | Date, checkOut: string | Date): string {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "0m";

  const totalMinutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatAttendanceTime(value?: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-LK", {
    timeZone: "Asia/Colombo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatAttendanceDate(value?: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-LK", {
    timeZone: "Asia/Colombo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isoToDatetimeLocal(value?: string | Date | null): string {
  if (!value) return "";
  const shifted = shiftToColombo(new Date(value));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

export function datetimeLocalToIso(value: string): string {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - COLOMBO_OFFSET_MS;
  return new Date(utcMillis).toISOString();
}

export function normalizeAttendanceStatus(status: string): AttendanceStatus {
  if (status === "Late") return "Late";
  if (status === "Absent") return "Absent";
  return "On Time";
}