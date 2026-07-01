"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Loader2, Car } from "lucide-react";
import { Supplier } from "@/types";
import { formatAddress } from "@/lib/address";
import { getSuppliers } from "@/app/actions/suppliers";

export default function SuppliersClient({
  suppliers: initialSuppliers,
  total: initialTotal,
  currentPage: initialPage,
}: {
  suppliers: Supplier[];
  total: number;
  currentPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [clientPage, setClientPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = clientPage + 1;
    const result = await getSuppliers({ search: search || undefined, page: nextPage, pageSize: 10 });
    if (result.data) {
      setAllSuppliers(prev => [...prev, ...result.data]);
      setClientPage(nextPage);
      if (result.count !== undefined) setTotal(result.count);
    }
    setLoadingMore(false);
  }

  function applySearch() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="section-card">
      <div className="px-5 py-4 border-b border-gray-100 flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="form-input pl-9"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applySearch()}
          />
        </div>
        {isPending && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
        <Link href="/suppliers/new" className="btn-primary ml-auto">
          <Plus className="w-4 h-4" /> Add Supplier
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Email</th><th>NIC</th><th>Address</th><th>Vehicles</th></tr>
          </thead>
          <tbody>
            {allSuppliers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No suppliers found</td></tr>
            )}
            {allSuppliers.map(s => (
              <tr key={s.id} onClick={() => router.push(`/suppliers/${s.id}`)} className="cursor-pointer transition-all duration-200 ease-out hover:bg-blue-50/80 hover:shadow-md hover:-translate-y-px hover:border-l-[3px] hover:border-l-blue-500 active:bg-blue-100 active:scale-[0.995] active:shadow-sm">
                <td><p className="font-medium text-gray-900">{s.name}</p></td>
                <td>{s.phone ?? "—"}</td>
                <td className="text-gray-500">{s.email ?? "—"}</td>
                <td className="text-gray-500">{s.nic ?? "—"}</td>
                <td className="text-gray-500 max-w-[150px] truncate">{formatAddress(s)}</td>
                <td>
                  <Link href={`/vehicles?supplier=${s.id}`} className="inline-flex items-center gap-1 text-blue-500 text-xs hover:underline">
                    <Car className="w-3 h-3" /> Vehicles
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Showing {allSuppliers.length} of {total}</span>
        {clientPage * 10 < total && (
          <button onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm">
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
      </div>

    </div>
  );
}
