"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Loader2 } from "lucide-react";
import { Company } from "@/types";
import { formatAddress } from "@/lib/address";
import { getCompanies } from "@/app/actions/companies";

export default function CompaniesClient({
  companies: initialCompanies,
  total: initialTotal,
  currentPage: initialPage,
}: {
  companies: Company[];
  total: number;
  currentPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [allCompanies, setAllCompanies] = useState<Company[]>(initialCompanies);
  const [clientPage, setClientPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = clientPage + 1;
    const result = await getCompanies({ search: search || undefined, page: nextPage, pageSize: 10 });
    if (result.data) {
      setAllCompanies(prev => [...prev, ...result.data]);
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
        <Link href="/companies/new" className="btn-primary ml-auto">
          <Plus className="w-4 h-4" /> Add Company
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Logo</th><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr>
          </thead>
          <tbody>
            {allCompanies.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No companies found</td></tr>
            )}
            {allCompanies.map(c => (
              <tr key={c.id} onClick={() => router.push(`/companies/${c.id}`)} className="cursor-pointer transition-colors duration-150 hover:bg-blue-50/70 active:bg-blue-100">
                <td>
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-100 text-xs flex items-center justify-center text-gray-400">—</div>
                  )}
                </td>
                <td><p className="font-medium text-gray-900">{c.name}</p></td>
                <td>{c.phone ?? "—"}</td>
                <td className="text-gray-500">{c.email ?? "—"}</td>
                <td className="text-gray-500 max-w-[150px] truncate">{formatAddress(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Showing {allCompanies.length} of {total}</span>
        {clientPage * 10 < total && (
          <button onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm">
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
      </div>

    </div>
  );
}
