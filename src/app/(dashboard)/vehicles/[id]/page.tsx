import { getVehicleById } from "@/app/actions/vehicles";
import { getSuppliers } from "@/app/actions/suppliers";
import { getCompanies } from "@/app/actions/companies";
import { getRentals } from "@/app/actions/rentals";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import ServiceAlertBadge from "@/components/shared/ServiceAlertBadge";
import VehicleDetailClient from "./VehicleDetailClient";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const [vehicle, { data: suppliers }, { data: companies }, { data: rentals }] = await Promise.all([
    getVehicleById(p.id),
    getSuppliers({ pageSize: 100 }),
    getCompanies({ pageSize: 100 }),
    getRentals({ vehicleReg: "", pageSize: 100 }),
  ]);
  if (!vehicle) notFound();

  const vehicleRentals = (rentals ?? []).filter((r: any) => r.vehicle_id === p.id);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/vehicles" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{vehicle.reg_number}</h1>
          <p className="page-subtitle">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
        </div>
        <ServiceAlertBadge currentKm={vehicle.current_km} nextServiceKm={vehicle.next_service_km} nextServiceDate={vehicle.next_service_date} />
        <StatusBadge status={vehicle.status} />
      </div>

      <VehicleDetailClient vehicle={vehicle} suppliers={suppliers} companies={companies} rentals={vehicleRentals as any} />
    </div>
  );
}
