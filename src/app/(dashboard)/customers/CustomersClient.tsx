"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Loader2, UserSearch } from "lucide-react";
import { Customer } from "@/types";
import { formatDate } from "@/lib/utils";
import { formatAddress } from "@/lib/address";
import { getCustomerByNic } from "@/app/actions/customers";

interface CustomersClientProps {
  customers: Customer[];
  total: number;
  currentPage: number;
}

export default function CustomersClient({ customers, total, currentPage }: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // NIC auto-fill state
  const [nicSearch, setNicSearch] = useState("");
  const [nicLookup, setNicLookup] = useState<Customer | null>(null);
  const [nicSearching, setNicSearching] = useState(false);

  function applySearch() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function handleNicSearch() {
    if (!nicSearch) return;
    setNicSearching(true);
    try {
      const result = await getCustomerByNic(nicSearch);
      setNicLookup(result ?? null);
      if (result) {
        // Navigate to the customer detail page
        router.push(`/customers/${result.id}`);
      }
    } finally {
      setNicSearching(false);
    }
  }

  return (
    <div className="section-card">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        {/* NIC auto-search */}
        <div className="flex gap-2 items-center">
          <div className="relative">
            <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="form-input pl-9 w-44"
              placeholder="NIC lookup..."
              value={nicSearch}
              onChange={e => setNicSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleNicSearch()}
            />
          </div>
          <button onClick={handleNicSearch} disabled={nicSearching} className="btn-secondary text-xs h-9 px-3">
            {nicSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Find"}
          </button>
          {nicLookup === null && nicSearch && !nicSearching && (
            <span className="text-xs text-gray-400">Not found</span>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200" />

        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search name, NIC, phone..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && applySearch()} />
        </div>
        {isPending && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
        <Link href="/customers/new" className="btn-primary ml-auto">
          <Plus className="w-4 h-4" /> Add Customer
        </Link>
      </div>


      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Name</th><th>NIC</th><th>Phone</th><th>Phone 2</th><th>License</th><th>License Expiry</th><th>Address</th></tr></thead>
          <tbody>
            {customers.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No customers found</td></tr>}
            {customers.map((c) => (
              <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} className="cursor-pointer transition-colors duration-150 hover:bg-blue-50/70 active:bg-blue-100">
                <td><p className="font-medium text-gray-900">{c.name}</p></td>
                <td className="text-gray-500">{c.nic ?? "—"}</td>
                <td>{c.phone ?? "—"}</td>
                <td className="text-gray-400">{c.phone2 ?? "—"}</td>
                <td className="text-gray-500">{c.license_number ?? "—"}</td>
                <td className="text-gray-500">{formatDate(c.license_expiry)}</td>
                <td className="text-gray-500 max-w-[150px] truncate">{formatAddress(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Showing {customers.length} of {total}</span>
        {currentPage * 10 < total && (
          <Link href={`${pathname}?page=${currentPage + 1}`} className="btn-secondary text-sm">Load More</Link>
        )}
      </div>

    </div>
  );
}
