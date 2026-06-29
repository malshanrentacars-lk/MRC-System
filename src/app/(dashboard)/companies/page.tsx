import { getCompanies } from "@/app/actions/companies";
import CompaniesClient from "./CompaniesClient";

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const { data: companies, count } = await getCompanies({ search: sp.search, page, pageSize: 10 });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">Manage companies — {count} total</p>
        </div>
      </div>
      <CompaniesClient companies={companies} total={count} currentPage={page} />
    </div>
  );
}
