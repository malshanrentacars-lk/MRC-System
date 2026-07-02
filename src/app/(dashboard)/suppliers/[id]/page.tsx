import { notFound } from "next/navigation";
import SupplierDetailClient from "./SupplierDetailClient";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

async function getSupplierById(id: string) {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

async function getVehiclesBySupplier(supplierId: string) {
  await requireAuth();
  const { data } = await supabaseAdmin
    .from("vehicles")
    .select("*, rentals(total_amount, status)")
    .eq("supplier_id", supplierId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const [supplier, vehicles] = await Promise.all([
    getSupplierById(p.id),
    getVehiclesBySupplier(p.id),
  ]);
  
  if (!supplier) notFound();

  return <SupplierDetailClient supplier={supplier} vehicles={vehicles} />;
}
