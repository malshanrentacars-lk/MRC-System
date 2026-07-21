import { getRentals } from "@/app/actions/rentals";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DeletedRentalsClient from "@/app/(dashboard)/rentals/DeletedRentalsClient";

export default async function DeletedRentalsPage() {
  const { data: rentals, count } = await getRentals({ status: 'cancelled', page: 1, pageSize: 500 });
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Deleted Rentals</h1>
          <p className="page-subtitle">Recently deleted rentals — {count} total</p>
        </div>
        <div>
          <Link href="/rentals" className="btn-ghost inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Rentals
          </Link>
        </div>
      </div>
      <DeletedRentalsClient rentals={rentals} />
    </div>
  );
}
