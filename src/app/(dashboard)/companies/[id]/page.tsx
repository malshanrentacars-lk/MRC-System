import { getCompanyById } from "@/app/actions/companies";
import { notFound } from "next/navigation";
import CompanyDetailClient from "./CompanyDetailClient";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const company = await getCompanyById(p.id);

  if (!company) notFound();

  return <CompanyDetailClient company={company} />;
}
