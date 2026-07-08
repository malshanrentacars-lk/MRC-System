"use client";

import { useState, useTransition, memo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, Search, Loader2, ChevronDown, Calendar } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Rental } from "@/types";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils";
import { useDebounce } from "@/lib/useDebounce";

const RentalGridRow = memo(function RentalGridRow({ rental, onClick }: { rental: Rental; onClick: () => void }) {
  const overdue = rental.status === "active" && isOverdue(rental.end_date);
  return (
    <tr onClick={onClick} className={`${overdue ? "bg-red-50/30" : ""} border-b border-gray-100 cursor-pointer transition-all duration-200 ease-out hover:bg-blue-50/80 hover:shadow-md hover:-translate-y-px hover:border-l-[3px] hover:border-l-blue-500 active:bg-blue-100 active:scale-[0.995] active:shadow-sm`}>
      <td onClick={e => e.stopPropagation()}>
        <Link href={`/rentals/${rental.id}`} className="text-blue-500 hover:text-blue-700">
          <Eye className="w-4 h-4" />
        </Link>
      </td>
      <td><span className="font-semibold text-blue-600">{rental.rental_number}</span></td>
      <td>
        <p className="font-medium text-gray-900">{rental.customer?.name}</p>
        <p className="text-xs text-gray-400">{rental.customer?.phone}</p>
      </td>
      <td>
        <p className="font-medium">{rental.vehicle?.brand} {rental.vehicle?.model}</p>
        <p className="text-xs text-gray-400">{rental.vehicle?.reg_number}</p>
      </td>
      <td className="text-sm">{formatDate(rental.start_date)}</td>
      <td className="text-sm">{formatDate(rental.end_date)}</td>
      <td>{rental.total_days}d</td>
      <td>{formatCurrency(rental.daily_rate)}</td>
      <td className="font-semibold text-right">{formatCurrency(rental.total_amount ?? 0)}</td>
      <td>{formatCurrency(rental.deposit)}</td>
      <td><StatusBadge status={overdue ? "overdue" : rental.status} /></td>
    </tr>
  );
});

interface RentalsClientProps {
  rentals: Rental[];
  total: number;
  currentPage: number;
}

export default function RentalsClient({ rentals, total, currentPage }: RentalsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams?.get("search") ?? "");
  const [status, setStatus] = useState(() => searchParams?.get("status") ?? "all");
  const [vehicleReg, setVehicleReg] = useState(() => searchParams?.get("vehicleReg") ?? "");
  const [customerId, setCustomerId] = useState(() => searchParams?.get("customerId") ?? "");
  const [paymentStatus, setPaymentStatus] = useState(() => searchParams?.get("paymentStatus") ?? "");
  const [isPending, startTransition] = useTransition();

  function applyFilters(overrides?: Record<string, string>) {
    const params = new URLSearchParams();
    const s = overrides?.search ?? search;
    const st = overrides?.status ?? status;
    const vr = overrides?.vehicleReg ?? vehicleReg;
    const cid = overrides?.customerId ?? customerId;
    const ps = overrides?.paymentStatus ?? paymentStatus;
    if (s) params.set("search", s);
    if (st !== "all") params.set("status", st);
    if (vr) params.set("vehicleReg", vr);
    if (cid) params.set("customerId", cid);
    if (ps) params.set("paymentStatus", ps);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const debouncedFilter = useDebounce(applyFilters, 300);

  const hasMore = currentPage * 10 < total;

  function goToPage(pageNum: number) {
    const base = new URLSearchParams(searchParams?.toString() ?? "");
    if (pageNum <= 1) base.delete("page"); else base.set("page", String(pageNum));
    startTransition(() => router.push(`${pathname}?${base.toString()}`));
  }

  return (
    <div className="section-card">
      {/* Filters */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="grid grid-cols-4 gap-3 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="form-input pl-9 bg-slate-50 border border-gray-200 placeholder-gray-400" placeholder="Rental Number" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
          </div>

          <div>
            <input className="form-input bg-slate-50 border border-gray-200 placeholder-gray-400" placeholder="Customer ID" value={customerId}
              onChange={(e) => setCustomerId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
          </div>

          <div>
            <input className="form-input bg-slate-50 border border-gray-200 placeholder-gray-400" placeholder="Vehicle Reg Number" value={vehicleReg}
              onChange={(e) => setVehicleReg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
          </div>

          <div className="relative">
            <select className="form-select w-full pr-8 bg-white" value={status}
              onChange={(e) => { setStatus(e.target.value); debouncedFilter({ status: e.target.value }); }}>
              <option value="all">Status</option>
              {["active","booked","returned","overdue","cancelled"].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <div className="relative">
            <select className="form-select w-full pr-8 bg-white" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); debouncedFilter({ paymentStatus: e.target.value }); }}>
              <option value="">Payment Status</option>
              <option value="paid">Paid</option>
              <option value="balance_due">Balance Due</option>
              <option value="refund_pending">Refund Pending</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <div className="relative">
            <input type="date" className="form-input pr-9 bg-white" value={searchParams?.get("dateFrom") ?? ""} onChange={(e) => { applyFilters({ dateFrom: e.target.value }); }} />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <div className="col-span-4 flex justify-end items-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Actions</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Rental #</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Vehicle</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Pickup</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Return</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Days</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Daily Rate</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide text-right">Amount</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Deposit</th>
              <th className="text-xs text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {rentals.length === 0 && (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">No rentals found</td></tr>
            )}
            {rentals.map((r) => (
              <RentalGridRow key={r.id} rental={r} onClick={() => router.push(`/rentals/${r.id}`)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, total)} of {total}</span>
        <div className="flex items-center gap-2">
          {(() => {
            const pageSize = 10;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const pages = [] as number[];
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, currentPage + 2);
            for (let p = start; p <= end; p++) pages.push(p);
            return (
              <div className="flex items-center gap-1">
                <button className="btn-ghost px-2" onClick={() => goToPage(1)} disabled={currentPage === 1}>First</button>
                <button className="btn-ghost px-2" onClick={() => goToPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>&lt;</button>
                {pages.map(p => (
                  <button key={p} onClick={() => goToPage(p)} className={p === currentPage ? "px-3 py-1 rounded bg-blue-600 text-white" : "px-3 py-1 rounded border text-gray-700"}>{p}</button>
                ))}
                <button className="btn-ghost px-2" onClick={() => goToPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>&gt;</button>
                <button className="btn-ghost px-2" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>Last</button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
