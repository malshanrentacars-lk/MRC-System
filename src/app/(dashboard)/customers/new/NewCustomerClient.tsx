"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createCustomer } from "@/app/actions/customers";
import FileUploader from "@/components/shared/FileUploader";
import AddressFields from "@/components/shared/AddressFields";

export default function NewCustomerClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCustomer(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      router.push(`/customers/${result.data.id}`);
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
            <label className="form-label">Full Name <span className="text-red-500">*</span></label>
            <input name="name" required className="form-input" placeholder="e.g. John Doe" />
          </div>
          <div>
            <label className="form-label">NIC</label>
            <input name="nic" className="form-input" />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input name="phone" className="form-input" placeholder="e.g. 0771234567" />
          </div>
          <div>
            <label className="form-label">Phone 2</label>
            <input name="phone2" className="form-input" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" />
          </div>
          <AddressFields className="md:col-span-2 lg:col-span-3" />
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">Driving License</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">License Number</label>
            <input name="license_number" className="form-input" />
          </div>
          <div>
            <label className="form-label">License Expiry</label>
            <input name="license_expiry" type="date" className="form-input" />
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <FileUploader
                label="License Image — Front (JPG/PNG/PDF, max 5MB)"
                bucket="temp-uploads"
                folder="customers/new"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={false}
                maxFiles={1}
                fieldName="driving_license_front"
              />
            </div>
            <div>
              <FileUploader
                label="License Image — Back (JPG/PNG/PDF, max 5MB)"
                bucket="temp-uploads"
                folder="customers/new"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple={false}
                maxFiles={1}
                fieldName="driving_license_back"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">Documents</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <FileUploader
              label="NIC — Front (JPG/PNG/PDF, max 5MB)"
              bucket="temp-uploads"
              folder="customers/new"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple={false}
              maxFiles={1}
              fieldName="nic_front"
            />
          </div>
          <div>
            <FileUploader
              label="NIC — Back (JPG/PNG/PDF, max 5MB)"
              bucket="temp-uploads"
              folder="customers/new"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple={false}
              maxFiles={1}
              fieldName="nic_back"
            />
          </div>
          <div>
            <FileUploader
              label="Customer Photo (JPG/PNG, max 5MB)"
              bucket="temp-uploads"
              folder="customers/new"
              accept=".jpg,.jpeg,.png"
              multiple={false}
              maxFiles={1}
              fieldName="photo"
            />
          </div>
          <div>
            <FileUploader
              label="Utility Bill (JPG/PNG/PDF, max 5MB)"
              bucket="temp-uploads"
              folder="customers/new"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple={false}
              maxFiles={1}
              fieldName="utility_bill"
            />
          </div>
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
        <Link href="/customers" className="btn-secondary">Cancel</Link>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Saving..." : "Add Customer"}
        </button>
      </div>
    </form>
  );
}
