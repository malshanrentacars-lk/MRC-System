"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Eye, Loader2 } from "lucide-react";
import { Guarantor } from "@/types";
import { formatAddress } from "@/lib/address";
import { getGuarantors } from "@/app/actions/suppliers";

export default function GuarantorsClient({
  guarantors: initialGuarantors,
  total: initialTotal,
  currentPage: initialPage,
}: {
  guarantors: Guarantor[];
  total: number;
  currentPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [allGuarantors, setAllGuarantors] = useState<Guarantor[]>(initialGuarantors);
  const [clientPage, setClientPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = clientPage + 1;
    const result = await getGuarantors({ search: search || undefined, page: nextPage, pageSize: 10 });
    if (result.data) {
      setAllGuarantors(prev => [...prev, ...result.data]);
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
            placeholder="Search name, NIC, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && applySearch()}
          />
        </div>
        {isPending && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
        <Link href="/guarantors/new" className="btn-primary ml-auto">
          <Plus className="w-4 h-4" /> Add Guarantor
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Name</th><th>NIC</th><th>Phone</th><th>Address</th><th>Linked To</th></tr></thead>
          <tbody>
            {allGuarantors.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No guarantors found</td></tr>
            )}
            {allGuarantors.map(g => (
              <tr key={g.id} onClick={() => router.push(`/guarantors/${g.id}`)} className="cursor-pointer transition-all duration-200 ease-out hover:bg-blue-50/80 hover:shadow-md hover:-translate-y-px hover:border-l-[3px] hover:border-l-blue-500 active:bg-blue-100 active:scale-[0.995] active:shadow-sm">
                <td><p className="font-medium text-gray-900">{g.name}</p></td>
                <td className="text-gray-500">{g.nic ?? "—"}</td>
                <td>{g.phone ?? "—"}</td>
                <td className="text-gray-500 max-w-[150px] truncate">{formatAddress(g)}</td>
                <td>
                  {g.customer ? (
                    <span className="text-xs text-gray-500">{g.customer.name}</span>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Showing {allGuarantors.length} of {total}</span>
        {clientPage * 10 < total && (
          <button onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm">
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
}
