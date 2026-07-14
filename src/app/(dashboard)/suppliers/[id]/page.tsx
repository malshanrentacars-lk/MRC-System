import { notFound } from "next/navigation";
import SupplierDetailClient from "./SupplierDetailClient";
import { requireAuth } from "@/lib/auth";
import { getSupplierById, getVehiclesBySupplier } from "@/app/actions/suppliers";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const p = await params;
  const [supplier, vehicles] = await Promise.all([
    getSupplierById(p.id),
    getVehiclesBySupplier(p.id),
  ]);
  
  if (!supplier) notFound();

  return <SupplierDetailClient supplier={supplier} vehicles={vehicles} />;
}
