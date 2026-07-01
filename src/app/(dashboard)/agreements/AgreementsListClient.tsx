"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import { getRentals } from "@/app/actions/rentals";

interface Props {
  rentals: Awaited<ReturnType<typeof getRentals>>["data"];
  count: number;
  initialPage: number;
}

export default function AgreementsListClient({ rentals: initialRentals, count: initialCount, initialPage }: Props) {
  const [allRentals, setAllRentals] = useState(initialRentals);
  const [clientPage, setClientPage] = useState(initialPage);
  const [total, setTotal] = useState(initialCount);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = clientPage + 1;
    const result = await getRentals({ page: nextPage, pageSize: 15 });
    if (result.data) {
      setAllRentals(prev => [...prev, ...result.data]);
      setClientPage(nextPage);
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
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Period</th>
              <th>Status</th>
              <th>Agreement</th>
            </tr>
          </thead>
          <tbody>
            {allRentals.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No rentals found</td></tr>
            )}
            {allRentals.map(r => (
              <tr key={r.id}>
                <td><span className="font-semibold text-blue-600">{r.rental_number}</span></td>
                <td><p className="font-medium">{r.customer?.name}</p></td>
                <td>
                  <p className="font-medium">{r.vehicle?.brand} {r.vehicle?.model}</p>
                  <p className="text-xs text-gray-400">{r.vehicle?.reg_number}</p>
                </td>
                <td className="text-sm text-gray-600">
                  {formatDate(r.start_date)} → {formatDate(r.end_date)}
                </td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className="flex gap-2">
                    <Link href={`/rentals/${r.id}`} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs">
                      <Eye className="w-3 h-3" /> Rental
                    </Link>
                    <a
                      href={`/agreements/${r.id}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-medium"
                    >
                      <FileText className="w-3 h-3" /> Print
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">Showing {allRentals.length} of {total}</span>
        {clientPage * 15 < total && (
          <button onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm">
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
}
