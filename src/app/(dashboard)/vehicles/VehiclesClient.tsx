"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Eye, Search, Filter, ChevronDown, Loader2 } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import ServiceAlertBadge from "@/components/shared/ServiceAlertBadge";
import { Vehicle, Supplier } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface VehiclesClientProps {
  vehicles: Vehicle[];
  suppliers: Supplier[];
  total: number;
  currentPage: number;
}

export default function VehiclesClient({ vehicles, total, currentPage }: VehiclesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [isPending, startTransition] = useTransition();

  function applyFilters(overrides?: Record<string, string>) {
    const params = new URLSearchParams();
    const s = overrides?.search ?? search;
    const t = overrides?.type ?? type;
    const st = overrides?.status ?? status;
    const so = overrides?.source ?? source;
    if (s) params.set("search", s);
    if (t !== "all") params.set("type", t);
    if (st !== "all") params.set("status", st);
    if (so !== "all") params.set("source", so);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const hasMore = currentPage * 10 < total;
  const shown = vehicles.length;

  return (
    <div className="section-card">
      {/* Filters */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search reg, brand, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>

        <select className="form-select w-auto" value={type} onChange={(e) => { setType(e.target.value); applyFilters({ type: e.target.value }); }}>
          <option value="all">All Types</option>
          {["Sedan","Hatchback","SUV","Van","Pickup","Bus","Other"].map(t => <option key={t}>{t}</option>)}
        </select>

        <select className="form-select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); applyFilters({ status: e.target.value }); }}>
          <option value="all">All Status</option>
          {["available","rented","booked","in_garage"].map(s => <option key={s} value={s}>{s.replace("_"," ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>

        <select className="form-select w-auto" value={source} onChange={(e) => { setSource(e.target.value); applyFilters({ source: e.target.value }); }}>
          <option value="all">All Owners</option>
          <option value="Company">Company</option>
          <option value="Supplier">Supplier</option>
        </select>

        {isPending && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reg. Number</th>
              <th>Brand</th>
              <th>Model</th>
              <th>Year</th>
              <th>Type</th>
              <th>Source</th>
              <th>Daily Rate</th>
              <th>Km</th>
              <th>Service</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">No vehicles found</td></tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} onClick={() => router.push(`/vehicles/${v.id}`)} className="cursor-pointer transition-colors duration-150 hover:bg-blue-50/70 active:bg-blue-100">
                <td><span className="font-semibold text-gray-900">{v.reg_number}</span></td>
                <td className="text-blue-600 font-medium">{v.brand}</td>
                <td>{v.model}</td>
                <td>{v.year ?? "—"}</td>
                <td><StatusBadge status={v.type?.toLowerCase() || "unknown"} /></td>
                <td><StatusBadge status={v.source?.toLowerCase() || "unknown"} /></td>
                <td className="font-medium">{formatCurrency(v.daily_rate)}</td>
                <td className="text-gray-500">{(v.current_km || 0).toLocaleString()} km</td>
                <td>
                  <ServiceAlertBadge
                    currentKm={v.current_km || 0}
                    nextServiceKm={v.next_service_km || 0}
                    nextServiceDate={v.next_service_date}
                  />
                </td>
                <td><StatusBadge status={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Showing {shown} of {total}</span>
        {hasMore && (
          <Link href={`${pathname}?page=${currentPage + 1}`} className="btn-secondary text-sm">
            Load More
          </Link>
        )}
      </div>
    </div>
  );
}
