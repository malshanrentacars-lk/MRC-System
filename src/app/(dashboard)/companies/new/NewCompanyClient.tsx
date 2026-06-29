"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileUploader from "@/components/shared/FileUploader";
import AddressFields from "@/components/shared/AddressFields";
import { createCompany } from "@/app/actions/companies";

export default function NewCompanyClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createCompany(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      router.push(`/companies/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">Basic Details</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Company Name <span className="text-red-500">*</span></label>
            <input name="name" required className="form-input" placeholder="e.g. Acme Ltd" />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input name="phone" className="form-input" placeholder="e.g. 0771234567" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" />
          </div>
          <AddressFields />
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
            folder="companies/new"
            accept=".jpg,.jpeg,.png"
            multiple={false}
            maxFiles={1}
            maxFileSizeMB={5}
            fieldName="logo"
          />
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">Additional Info</h2>
        </div>
        <div className="p-5">
          <label className="form-label">Notes</label>
          <textarea name="notes" rows={3} className="form-input resize-none" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Link href="/companies" className="btn-secondary">Cancel</Link>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Saving..." : "Add Company"}
        </button>
      </div>
    </form>
  );
}
