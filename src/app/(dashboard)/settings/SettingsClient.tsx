"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCompanySettings } from "@/app/actions/users";
import { CompanySettings } from "@/types";
import { CheckCircle } from "lucide-react";
import AddressFields from "@/components/shared/AddressFields";

export default function SettingsClient({ settings }: { settings: CompanySettings | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCompanySettings(fd) as any;
      if (result?.error) { setError(result.error as string); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    });
  }

  return (
    <div className="section-card">
      <div className="section-card-header">
        <h2 className="section-card-title">Company Information</h2>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Saved!
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {[
          { name: "company_name", label: "Company Name", required: true, defaultValue: settings?.company_name ?? "MRC", placeholder: "e.g. MRC Rentals" },
          { name: "phone", label: "Phone", defaultValue: settings?.phone, placeholder: "e.g. +94 11 123 4567" },
          { name: "email", label: "Email", type: "email", defaultValue: settings?.email, placeholder: "e.g. info@mrc.lk" },
        ].map(f => (
          <div key={f.name}>
            <label className="form-label">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
            <input name={f.name} type={f.type ?? "text"} required={f.required} defaultValue={f.defaultValue ?? ""} placeholder={f.placeholder} className="form-input" />
          </div>
        ))}

        <AddressFields defaultValues={settings} className="space-y-2" />

        <div>
          <label className="form-label">Service Interval (KM)</label>
          <input name="service_interval_km" type="number" defaultValue={settings?.service_interval_km ?? 5000} className="form-input max-w-[200px]" />
          <p className="text-xs text-gray-400 mt-1">Vehicles will alert after this many km between services.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="pt-2">
          <button type="submit" disabled={isPending} className="btn-primary">{isPending ? "Saving..." : "Save Settings"}</button>
        </div>
      </form>
    </div>
  );
}
