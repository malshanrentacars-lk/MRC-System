import { getSuppliers } from "@/app/actions/suppliers";
import { getCompanies } from "@/app/actions/companies";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewVehicleClient from "./NewVehicleClient";

export default async function NewVehiclePage() {
  const { data: suppliers } = await getSuppliers({ pageSize: 100 });
  const { data: companies } = await getCompanies({ pageSize: 100 });
  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/vehicles" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="page-title">Add Vehicle</h1>
          <p className="page-subtitle">Register a new vehicle in the fleet</p>
        </div>
      </div>
      <NewVehicleClient suppliers={suppliers} companies={companies} />
    </div>
  );
}
