"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, Mail, MapPin, Phone, Edit, Trash2 } from "lucide-react";
import { Company } from "@/types";
import { formatDate } from "@/lib/utils";
import { formatAddress } from "@/lib/address";
import { updateCompany, deleteCompany } from "@/app/actions/companies";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
import FileUploader from "@/components/shared/FileUploader";
import AddressFields from "@/components/shared/AddressFields";

export default function CompanyDetailClient({ company }: { company: Company }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingFd, setPendingFd] = useState<FormData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPendingFd(fd);
    setError(null);
    setConfirmEdit(true);
  }

  async function performEdit() {
    if (!pendingFd) return;
    startTransition(async () => {
      const result = await updateCompany(company.id, pendingFd);
      if ("error" in result && result.error) { setError(result.error); setConfirmEdit(false); return; }
      setConfirmEdit(false);
      setEditing(false);
      setPendingFd(null);
      router.refresh();
    });
  }

  function handleDeleteClick() {
    setConfirmDelete(true);
  }

  async function performDelete() {
    startTransition(async () => {
      const result = await deleteCompany(company.id);
      if ("error" in result && result.error) { setError(result.error); return; }
      router.push("/companies");
    });
  }

  if (editing) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href={`/companies/${company.id}`} onClick={() => setEditing(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="page-title">Edit Company</h1>
            <p className="page-subtitle">{company.name}</p>
          </div>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">Basic Details</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs">Company Name <span className="text-red-500">*</span></label>
                <input name="name" required defaultValue={company.name} className="form-input text-sm" />
              </div>
              <div>
                <label className="form-label text-xs">Phone</label>
                <input name="phone" defaultValue={company.phone ?? ""} className="form-input text-sm" />
              </div>
              <div>
                <label className="form-label text-xs">Email</label>
                <input name="email" type="email" defaultValue={company.email ?? ""} className="form-input text-sm" />
              </div>
              <AddressFields defaultValues={{
                street_address: company.street_address,
                street_address_2: company.street_address_2,
                city: company.city,
                postal_code: company.postal_code,
                address: company.address,
              }} />
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">Logo</h2>
            </div>
            <div className="p-5">
              <FileUploader
                label="Company Logo (PNG/JPG, max 5MB)"
                bucket="temp-uploads"
                folder="companies"
                accept=".jpg,.jpeg,.png"
                multiple={false}
                maxFiles={1}
                maxFileSizeMB={5}
                fieldName="logo"
                initialFiles={company.logo_url ? [{ url: company.logo_url, path: company.logo_path || "" }] : []}
              />
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">Additional Info</h2>
            </div>
            <div className="p-5">
              <label className="form-label text-xs">Notes</label>
              <textarea name="notes" rows={3} defaultValue={company.notes ?? ""} className="form-input text-sm resize-none" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    );
  }

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
        <div className="section-card-header flex items-center justify-between flex-wrap gap-2">
          <h2 className="section-card-title flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Details
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
              <Edit className="w-3.5 h-3.5 mr-1" /> Edit
            </button>
            <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </button>
          </div>
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

      <PasswordConfirmModal open={confirmEdit} onOpenChange={setConfirmEdit} title="Save Changes" description="Please verify your password to save changes to this company." onConfirm={performEdit} />
      <PasswordConfirmModal open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete Company" description={`Are you sure you want to delete ${company.name}? This cannot be undone.`} onConfirm={performDelete} variant="danger" />
    </div>
  );
}
