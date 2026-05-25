"use client";

import { useDeferredValue, useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { checkInAttendance, checkOutAttendance, clearAllAttendance, clearAttendanceEntry, deleteAttendance, updateAttendance } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { formatAttendanceDate, formatAttendanceTime, isoToDatetimeLocal } from "@/lib/attendance";
import type { AttendanceRecord, AttendanceReportRow, AttendanceStatus, AttendanceSummary, SessionUser } from "@/types";

type AttendanceDashboardData = {
  isAdmin: boolean;
  summary: AttendanceSummary;
  records: AttendanceRecord[];
  todayRecords: AttendanceRecord[];
  reportRows: AttendanceReportRow[];
};

type AttendanceClientProps = {
  initialData: AttendanceDashboardData;
  session: SessionUser;
};

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error";
};

type EditFormState = {
  check_in: string;
  check_out: string;
  status: AttendanceStatus;
};

function toColomboDateKey(value?: string | Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(new Date(value));
}

function buildWorkingLabel(record: AttendanceRecord) {
  if (record.working_hours) return record.working_hours;
  if (record.check_in && record.check_out) return `${formatAttendanceTime(record.check_in)} - ${formatAttendanceTime(record.check_out)}`;
  return "—";
}

function StatusPill({ status }: { status: AttendanceStatus }) {
  const className =
    status === "On Time"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "Late"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>{status}</span>;
}

function SummaryCard({ title, value, helper, accent, icon: Icon }: { title: string; value: number; helper: string; accent: "emerald" | "amber" | "red" | "blue"; icon: ComponentType<{ className?: string }> }) {
  const accentClasses =
    accent === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : accent === "amber"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : accent === "red"
          ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";

  return (
    <div className="section-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${accentClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AttendanceClient({ initialData, session }: AttendanceClientProps) {
  const router = useRouter();
  const [records, setRecords] = useState(initialData.records);
  const [todayRecords, setTodayRecords] = useState(initialData.todayRecords);
  const [summary, setSummary] = useState(initialData.summary);
  const [reportRows, setReportRows] = useState(initialData.reportRows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [isCheckInLoading, setIsCheckInLoading] = useState(false);
  const [isCheckOutLoading, setIsCheckOutLoading] = useState(false);
  const [isClearAllLoading, setIsClearAllLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ check_in: "", check_out: "", status: "On Time" });
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    setRecords(initialData.records);
    setTodayRecords(initialData.todayRecords);
    setSummary(initialData.summary);
    setReportRows(initialData.reportRows);
  }, [initialData]);

  useEffect(() => {
    const channel = supabase
      .channel("attendance-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const showToast = (toast: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3500);
  };

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        !deferredSearch ||
        [record.employee_name, record.employee_email ?? "", record.status, record.id].join(" ").toLowerCase().includes(deferredSearch);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesDate = !dateFilter || toColomboDateKey(record.created_at) === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [dateFilter, deferredSearch, records, statusFilter]);

  const filteredReportRows = useMemo(() => {
    return reportRows.filter((row) => !deferredSearch || [row.employee_name, row.employee_email ?? ""].join(" ").toLowerCase().includes(deferredSearch));
  }, [deferredSearch, reportRows]);

  async function finishMutation(message: string, variant: "success" | "error" = "success") {
    showToast({ title: message, variant });
    if (variant === "success") router.refresh();
  }

  async function handleCheckIn() {
    setIsCheckInLoading(true);
    try {
      const result = await checkInAttendance();
      await finishMutation(result?.error ?? "Checked in successfully.", result?.error ? "error" : "success");
    } catch (error) {
      await finishMutation(error instanceof Error ? error.message : "Check in failed.", "error");
    } finally {
      setIsCheckInLoading(false);
    }
  }

  async function handleCheckOut() {
    setIsCheckOutLoading(true);
    try {
      const result = await checkOutAttendance();
      await finishMutation(result?.error ?? "Checked out successfully.", result?.error ? "error" : "success");
    } catch (error) {
      await finishMutation(error instanceof Error ? error.message : "Check out failed.", "error");
    } finally {
      setIsCheckOutLoading(false);
    }
  }

  function openEditModal(record: AttendanceRecord) {
    setSelectedRecord(record);
    setEditForm({ check_in: isoToDatetimeLocal(record.check_in), check_out: isoToDatetimeLocal(record.check_out), status: record.status });
  }

  async function handleSaveAttendance() {
    if (!selectedRecord) return;
    setIsSaveLoading(true);
    try {
      const result = await updateAttendance(selectedRecord.id, {
        check_in: editForm.check_in || null,
        check_out: editForm.check_out || null,
        status: editForm.status,
      });

      if (result?.error) {
        showToast({ title: "Update failed", description: result.error, variant: "error" });
        return;
      }

      setSelectedRecord(null);
      showToast({ title: "Attendance updated", variant: "success" });
      router.refresh();
    } catch (error) {
      showToast({ title: "Update failed", description: error instanceof Error ? error.message : "Unable to save attendance.", variant: "error" });
    } finally {
      setIsSaveLoading(false);
    }
  }

  async function handleClearEntry(record: AttendanceRecord) {
    if (!window.confirm(`Clear attendance entry for ${record.employee_name}?`)) return;
    const result = await clearAttendanceEntry(record.id);
    if (result?.error) return showToast({ title: "Clear failed", description: result.error, variant: "error" });
    showToast({ title: "Attendance cleared", variant: "success" });
    router.refresh();
  }

  async function handleDeleteAttendance(record: AttendanceRecord) {
    if (!window.confirm(`Delete attendance record for ${record.employee_name}? This cannot be undone.`)) return;
    const result = await deleteAttendance(record.id);
    if (result?.error) return showToast({ title: "Delete failed", description: result.error, variant: "error" });
    showToast({ title: "Attendance deleted", variant: "success" });
    router.refresh();
  }

  async function handleClearAll() {
    if (!window.confirm("Clear all attendance records? This is permanent.")) return;
    setIsClearAllLoading(true);
    try {
      const result = await clearAllAttendance();
      if (result?.error) {
        showToast({ title: "Clear all failed", description: result.error, variant: "error" });
        return;
      }
      showToast({ title: "Attendance history cleared", variant: "success" });
      router.refresh();
    } catch (error) {
      showToast({ title: "Clear all failed", description: error instanceof Error ? error.message : "Unable to clear attendance.", variant: "error" });
    } finally {
      setIsClearAllLoading(false);
    }
  }

  const pendingEmployees = Math.max(0, summary.totalEmployees - summary.present);

  return (
    <div className="space-y-5 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-3xl border border-border bg-card/95 p-5 shadow-sm backdrop-blur"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              <Clock3 className="h-3.5 w-3.5" />
              Attendance Module
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Attendance</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {session.role === "admin"
                  ? "Monitor check-ins, update records, and review employee attendance reports in one place."
                  : "Check in, check out, and review your own attendance history and working hours."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.refresh()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleCheckIn} disabled={isCheckInLoading} className="gap-2">
              {isCheckInLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Check In
            </Button>
            <Button variant="secondary" onClick={handleCheckOut} disabled={isCheckOutLoading} className="gap-2">
              {isCheckOutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
              Check Out
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Present Today" value={summary.present} helper={`Out of ${summary.totalEmployees} employees`} accent="emerald" icon={Users} />
        <SummaryCard title="Late Arrivals" value={summary.late} helper="After 09:00 AM" accent="amber" icon={Clock3} />
        <SummaryCard title="Pending" value={pendingEmployees} helper="No check-in yet" accent="red" icon={XCircle} />
        <SummaryCard title="Working Now" value={summary.working} helper="Checked in, not checked out" accent="blue" icon={CheckCircle2} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="section-card overflow-hidden">
          <div className="section-card-header flex-wrap gap-3">
            <h2 className="section-card-title">Attendance History</h2>
            {session.role === "admin" ? (
              <Button variant="outline" onClick={handleClearAll} disabled={isClearAllLoading} className="gap-2 text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200">
                {isClearAllLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Clear All
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1.4fr_0.9fr_0.6fr]">
            <div className="relative md:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees, email, or record ID" className="pl-9" />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AttendanceStatus | "all")} className="form-select pl-9">
                <option value="all">All statuses</option>
                <option value="On Time">On Time</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table min-w-[960px]">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Working Hours</th>
                  {session.role === "admin" ? <th className="text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length ? (
                  filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{record.employee_name}</p>
                          <p className="text-xs text-muted-foreground">{record.employee_email ?? "No email"}</p>
                        </div>
                      </td>
                      <td>{formatAttendanceDate(record.created_at)}</td>
                      <td>{formatAttendanceTime(record.check_in)}</td>
                      <td>{formatAttendanceTime(record.check_out)}</td>
                      <td><StatusPill status={record.status} /></td>
                      <td>{buildWorkingLabel(record)}</td>
                      {session.role === "admin" ? (
                        <td>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditModal(record)} className="gap-2">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleClearEntry(record)} className="gap-2 text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
                              Clear
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteAttendance(record)} className="gap-2 text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200">
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={session.role === "admin" ? 7 : 6} className="py-10 text-center text-sm text-muted-foreground">
                      No attendance records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-5">
          <div className="section-card overflow-hidden">
            <div className="section-card-header flex-wrap gap-3">
              <h2 className="section-card-title">Today's Overview</h2>
              <p className="text-xs text-muted-foreground">Auto-updated with Supabase realtime</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {todayRecords.slice(0, 4).map((record) => (
                <div key={record.id} className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{record.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{record.employee_email ?? "No email"}</p>
                    </div>
                    <StatusPill status={record.status} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3"><span>Check In</span><span className="text-foreground">{formatAttendanceTime(record.check_in)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Check Out</span><span className="text-foreground">{formatAttendanceTime(record.check_out)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Hours</span><span className="text-foreground">{record.working_hours ?? "—"}</span></div>
                  </div>
                </div>
              ))}

              {!todayRecords.length ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground sm:col-span-2">
                  No attendance entries yet today.
                </div>
              ) : null}
            </div>
          </div>

          <div className="section-card overflow-hidden">
            <div className="section-card-header flex-wrap gap-3">
              <h2 className="section-card-title">Employee Reports</h2>
              <p className="text-xs text-muted-foreground">Aggregated attendance summary</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[760px]">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Total</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                    <th>Working</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReportRows.length ? (
                    filteredReportRows.map((row) => (
                      <tr key={row.employee_id}>
                        <td>
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{row.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{row.employee_email ?? "No email"}</p>
                          </div>
                        </td>
                        <td>{row.total}</td>
                        <td>{row.present}</td>
                        <td>{row.late}</td>
                        <td>{row.absent}</td>
                        <td>{row.working}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        No employee reports match the current search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>Update check-in, check-out, or status for the selected employee.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {selectedRecord ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">{selectedRecord.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedRecord.employee_email ?? "No email"}</p>
                </div>
                <div>
                  <Label htmlFor="attendance-check-in">Check In</Label>
                  <Input id="attendance-check-in" type="datetime-local" value={editForm.check_in} onChange={(event) => setEditForm((current) => ({ ...current, check_in: event.target.value }))} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="attendance-check-out">Check Out</Label>
                  <Input id="attendance-check-out" type="datetime-local" value={editForm.check_out} onChange={(event) => setEditForm((current) => ({ ...current, check_out: event.target.value }))} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="attendance-status">Status</Label>
                  <select id="attendance-status" value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as AttendanceStatus }))} className="form-select mt-1.5">
                    <option value="On Time">On Time</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRecord(null)} disabled={isSaveLoading}>Cancel</Button>
            <Button onClick={handleSaveAttendance} disabled={isSaveLoading} className="gap-2">
              {isSaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none fixed right-4 top-4 z-[80] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className={`pointer-events-auto w-80 rounded-2xl border px-4 py-3 text-sm shadow-xl ${
                toast.variant === "success"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
              }`}
            >
              <p className="font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-xs opacity-90">{toast.description}</p> : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}