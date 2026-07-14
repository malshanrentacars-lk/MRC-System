"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupplier } from "@/app/actions/suppliers";
import { BANKS } from "@/lib/vehicleData";
import FileUploader from "@/components/shared/FileUploader";
import AddressFields from "@/components/shared/AddressFields";

export default function NewSupplierClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nicNumber, setNicNumber] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Combine first + last name into `name`
    const firstName = (fd.get("first_name") as string ?? "").trim();
    const lastName = (fd.get("last_name") as string ?? "").trim();
    fd.set("name", [firstName, lastName].filter(Boolean).join(" "));

    const nicFront = (fd.get("nic_front_url") as string) || "";
    const nicBack = (fd.get("nic_back_url") as string) || "";
    if (!nicFront || !nicBack) {
      setError("Please upload NIC Front and NIC Back documents.");
      return;
    }
    
    startTransition(async () => {
      const result = await createSupplier(fd);
      if ("error" in result && result.error) { setError(result.error); return; }
      router.push(`/suppliers/${result.data.id}`);
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
            <label className="form-label">First Name <span className="text-red-500">*</span></label>
            <input name="first_name" required className="form-input" placeholder="e.g. John" />
          </div>
          <div>
            <label className="form-label">Last Name <span className="text-red-500">*</span></label>
            <input name="last_name" required className="form-input" placeholder="e.g. Perera" />
          </div>
          <div>
            <label className="form-label">Phone <span className="text-red-500">*</span></label>
            <input name="phone" required className="form-input" placeholder="e.g. 0771234567" />
          </div>
          <div>
            <label className="form-label">Phone 2</label>
            <input name="phone2" className="form-input" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" />
          </div>
          <div>
            <label className="form-label">NIC <span className="text-red-500">*</span></label>
            <input name="nic" required className="form-input uppercase" value={nicNumber} onChange={e => setNicNumber(e.target.value.toUpperCase())} />
          </div>
          <AddressFields />
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">Bank Details</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Bank <span className="text-red-500">*</span></label>
            <select name="bank" required className="form-select">
              <option value="">— Select Bank —</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Account Number <span className="text-red-500">*</span></label>
            <input name="account_number" required className="form-input" />
          </div>
          <div>
            <label className="form-label">Branch <span className="text-red-500">*</span></label>
            <input name="branch" required className="form-input" />
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">Documents</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FileUploader
              label="NIC — Front (JPG/PNG/PDF, max 5MB) *"
              bucket="suppliers"
              folder={`${nicNumber}/nic_front`}
              accept=".jpg,.jpeg,.png,.pdf"
              multiple={false}
              maxFiles={1}
              fieldName="nic_front"
            />
          </div>
          <div>
            <FileUploader
              label="NIC — Back (JPG/PNG/PDF, max 5MB) *"
              bucket="suppliers"
              folder={`${nicNumber}/nic_back`}
              accept=".jpg,.jpeg,.png,.pdf"
              multiple={false}
              maxFiles={1}
              fieldName="nic_back"
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
        <Link href="/suppliers" className="btn-secondary">Cancel</Link>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Saving..." : "Add Supplier"}
        </button>
      </div>
    </form>
  );
}
