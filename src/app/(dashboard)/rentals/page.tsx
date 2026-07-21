import { getRentals } from "@/app/actions/rentals";
import Link from "next/link";
import { Plus, Trash } from "lucide-react";
import RentalsClient from "./RentalsClient";

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; vehicleReg?: string; customerId?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const sp = await searchParams;
  const { data: rentals, count } = await getRentals({
    search: sp.search,
    status: sp.status,
    vehicleReg: sp.vehicleReg,
    customerId: sp.customerId,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    page: 1,
    pageSize: 10,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Rentals</h1>
          <p className="page-subtitle">Manage vehicle rentals — {count} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/rentals/deleted" className="btn-secondary inline-flex items-center gap-2">
            <Trash className="w-4 h-4" />
            <span className="font-medium">Deleted Rentals</span>
          </Link>
          <Link href="/rentals/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Rental
          </Link>
        </div>
      </div>
      <RentalsClient rentals={rentals} total={count} currentPage={1} />
    </div>
  );
}
