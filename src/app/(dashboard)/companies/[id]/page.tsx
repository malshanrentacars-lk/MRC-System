import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Calendar, Mail, MapPin, Phone } from "lucide-react";
import { getCompanyById } from "@/app/actions/companies";
import { formatDate } from "@/lib/utils";
import { formatAddress } from "@/lib/address";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const company = await getCompanyById(p.id);

  if (!company) notFound();

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/companies" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{company.name}</h1>
          <p className="page-subtitle">Company record and contact details</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${company.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {company.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="section-card overflow-hidden">
        <div className="section-card-header">
          <h2 className="section-card-title flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Details
          </h2>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { label: "Name", value: company.name },
              { label: "Phone", value: company.phone ?? "—", icon: Phone },
              { label: "Email", value: company.email ?? "—", icon: Mail },
              { label: "Address", value: formatAddress(company), icon: MapPin },
              { label: "Created On", value: formatDate(company.created_at), icon: Calendar },
              { label: "Record ID", value: company.id },
            ].map((field) => (
              <div key={field.label} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  {field.icon && <field.icon className="w-3.5 h-3.5" />}
                  {field.label}
                </p>
                <p className="text-sm font-medium text-gray-900 break-words">{field.value}</p>
              </div>
            ))}
          </div>

          {company.logo_url && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Logo</p>
              <a href={company.logo_url} target="_blank" rel="noreferrer" className="inline-block group">
                <div className="w-48 aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                  <img
                    src={company.logo_url}
                    alt={`${company.name} logo`}
                    className="w-full h-full object-contain p-4 group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
              </a>
            </div>
          )}

          {company.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Notes</p>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                {company.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}