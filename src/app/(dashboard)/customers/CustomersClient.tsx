"use client";

import { useState, useTransition, memo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Loader2, UserSearch } from "lucide-react";
import { Customer } from "@/types";
import { formatDate } from "@/lib/utils";
import { formatAddress } from "@/lib/address";
import { getCustomerByNic, getCustomers } from "@/app/actions/customers";

const CustomerGridRow = memo(function CustomerGridRow({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  return (
    <tr onClick={onClick} className="cursor-pointer transition-all duration-200 ease-out hover:bg-blue-50/80 hover:shadow-md hover:-translate-y-px hover:border-l-[3px] hover:border-l-blue-500 active:bg-blue-100 active:scale-[0.995] active:shadow-sm">
      <td><p className="font-medium text-gray-900">{customer.name}</p></td>
      <td className="text-gray-500">{customer.nic ?? "—"}</td>
      <td>{customer.phone ?? "—"}</td>
      <td className="text-gray-400">{customer.phone2 ?? "—"}</td>
      <td className="text-gray-500">{customer.license_number ?? "—"}</td>
      <td className="text-gray-500">{formatDate(customer.license_expiry)}</td>
      <td className="text-gray-500 max-w-[150px] truncate">{formatAddress(customer)}</td>
    </tr>
  );
});

interface CustomersClientProps {
  customers: Customer[];
  total: number;
  currentPage: number;
}

export default function CustomersClient({ customers: initialCustomers, total: initialTotal, currentPage: initialPage }: CustomersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [allCustomers, setAllCustomers] = useState<Customer[]>(initialCustomers);
  const [clientPage, setClientPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = clientPage + 1;
    const result = await getCustomers({ search: search || undefined, page: nextPage, pageSize: 10 });
    if (result.data) {
      setAllCustomers(prev => [...prev, ...result.data]);
      setClientPage(nextPage);
      if (result.count !== undefined) setTotal(result.count);
    }
    setLoadingMore(false);
  }

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
            {allCustomers.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No customers found</td></tr>}
            {allCustomers.map((c) => (
              <CustomerGridRow key={c.id} customer={c} onClick={() => router.push(`/customers/${c.id}`)} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Showing {allCustomers.length} of {total}</span>
        {clientPage * 10 < total && (
          <button onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm">
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
      </div>

    </div>
  );
}
