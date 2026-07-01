import { getRentals } from "@/app/actions/rentals";
import AgreementsListClient from "./AgreementsListClient";

export default async function AgreementsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const { data: rentals, count } = await getRentals({
    search: sp.search,
    page,
    pageSize: 15,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rental Agreements</h1>
          <p className="page-subtitle">Print or view agreements for any rental</p>
        </div>
      </div>

      <AgreementsListClient rentals={rentals} count={count} initialPage={page} />
    </div>
  );
}
