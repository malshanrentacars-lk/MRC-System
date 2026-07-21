import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { flattenContact } from "@/lib/contacts";
import GuarantorDetailClient from "./GuarantorDetailClient";

async function getGuarantorById(id: string) {
  await requireAuth();
  const { data, error } = await supabaseAdmin
    .from("guarantors")
    .select("id, contact_id, customer_id, relationship, utility_bill_path, contact:contacts(*), customer:customers(id, contact_id, contact:contacts(name, phone, nic, email))")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  const flat = flattenContact(data as Record<string, unknown>) as Record<string, unknown>;
  if (flat.customer && typeof flat.customer === 'object' && !Array.isArray(flat.customer)) {
    flat.customer = flattenContact(flat.customer as Record<string, unknown>);
  }
  return flat;
}

async function getGuarantorRentals(guarantorId: string) {
  await requireAuth();
  const { data } = await supabaseAdmin
    .from("rentals")
    .select("*, vehicle:vehicles(id, reg_number, brand, model), customer:customers(id, contact_id, contact:contacts(name, phone))")
    .eq("guarantor_id", guarantorId)
    .order("start_date", { ascending: false });
  return (data ?? []).map(r => {
    const customer = (r as Record<string, unknown>).customer;
    if (customer && typeof customer === 'object' && !Array.isArray(customer)) {
      (r as Record<string, unknown>).customer = flattenContact(customer as Record<string, unknown>);
    }
    return r;
  });
}

export default async function GuarantorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const [guarantor, rentals] = await Promise.all([
    getGuarantorById(p.id),
    getGuarantorRentals(p.id),
  ]);

  if (!guarantor) notFound();

  return <GuarantorDetailClient guarantor={guarantor} rentals={rentals} />;
}
