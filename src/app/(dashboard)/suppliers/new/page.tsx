import { getCompanies } from "@/app/actions/companies";
import NewSupplierClient from "./NewSupplierClient";

export default async function NewSupplierPage() {
  const { data: companies } = await getCompanies({ pageSize: 100 });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Supplier</h1>
          <p className="page-subtitle">Register a new vehicle supplier</p>
        </div>
      </div>
      <NewSupplierClient companies={companies} />
    </div>
  );
}
