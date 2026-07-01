"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { DepositEntry, getRefundableDeposits } from "@/app/actions/deposits";
import { formatCurrency, formatDate } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";

interface DepositsClientProps {
  deposits: DepositEntry[];
  total: number;
  currentPage: number;
}

const activeStatuses = ["active", "booked"];

export default function DepositsClient({ deposits: initialDeposits, total: initialTotal, currentPage: initialPage }: DepositsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allDeposits, setAllDeposits] = useState<DepositEntry[]>(initialDeposits);
  const [clientPage, setClientPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = clientPage + 1;
    const result = await getRefundableDeposits({ page: nextPage, pageSize: 10 });
    if (result.data) {
      setAllDeposits(prev => [...prev, ...result.data]);
      setClientPage(nextPage);
      if (result.count !== undefined) setTotal(result.count);
    }
    setLoadingMore(false);
  }

  async function goToPrevPage() {
    setLoadingMore(true);
    const prevPage = clientPage - 1;
    const result = await getRefundableDeposits({ page: prevPage, pageSize: 10 });
    if (result.data) {
      setAllDeposits(result.data);
      setClientPage(prevPage);
      if (result.count !== undefined) setTotal(result.count);
    }
    setLoadingMore(false);
  }

  return (
    <div className="section-card">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rental #</th>
              <th>Vehicle</th>
              <th>Customer</th>
              <th>Deposit Amount</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {allDeposits.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No deposit records found
                </td>
              </tr>
            )}
            {allDeposits.map((d) => {
              const isActive = activeStatuses.includes(d.status);
              return (
                <tr key={d.id} onClick={() => router.push(`/rentals/${d.id}`)} className={`${isActive ? "bg-blue-50/20" : ""} cursor-pointer transition-colors duration-150 hover:bg-blue-50/70 active:bg-blue-100`}>
                  <td>
                    <span className="font-semibold text-blue-600">{d.rental_number}</span>
                  </td>
                  <td>
                    <p className="font-medium text-gray-900">
                      {d.vehicle?.brand} {d.vehicle?.model}
                    </p>
                    <p className="text-xs text-gray-400">{d.vehicle?.reg_number}</p>
                  </td>
                  <td>
                    <p className="font-medium">{d.customer?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{d.customer?.phone}</p>
                  </td>
                  <td>
                    <span
                      className={`text-base font-bold ${
                        isActive ? "text-blue-600" : "text-red-500"
                      }`}
                    >
                      {formatCurrency(d.deposit)}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {isActive ? "Held" : "Released / Deducted"}
                    </p>
                  </td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="text-sm text-gray-500">{formatDate(d.updated_at)}</td>
                  <td>
                    <Link
                      href={`/rentals/${d.id}`}
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Showing {allDeposits.length} of {total} records
        </span>
        <div className="flex gap-2">
          {clientPage > 1 && (
            <button onClick={goToPrevPage} disabled={loadingMore} className="btn-secondary text-sm">
              Previous
            </button>
          )}
          {clientPage * 10 < total && (
            <button onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm">
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
