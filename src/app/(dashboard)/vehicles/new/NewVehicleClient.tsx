"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Check } from "lucide-react";
import { createVehicle } from "@/app/actions/vehicles";
import { Supplier } from "@/types";
import {
  BRANDS, COLORS, FUEL_TYPES, VEHICLE_TYPES, TRANSMISSION_TYPES, PAYMENT_TYPES, YEARS,
  getModels, calcTiersFromMonthly,
} from "@/lib/vehicleData";
import FileUploader from "@/components/shared/FileUploader";

type Tier = { label: string; days_from: number; days_to: number | null; rate_per_day: number };

export default function NewVehicleClient({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [brand, setBrand] = useState("Toyota");
  const [model, setModel] = useState("Corolla");
  const [models, setModels] = useState<string[]>(getModels("Toyota"));
  const [source, setSource] = useState("Company");
  const [payFreq, setPayFreq] = useState("1_month");
  const [payDays, setPayDays] = useState("");
  const [regNumber, setRegNumber] = useState("");

  // Rate tiers
  const [monthlyRate, setMonthlyRate] = useState(30000);
  const [tiers, setTiers] = useState<Tier[]>(calcTiersFromMonthly(30000));
  const [editingTier, setEditingTier] = useState<number | null>(null);

  function handleBrandChange(b: string) {
    setBrand(b);
    const m = getModels(b);
    setModels(m);
    setModel(m[0]);
  }

  function calcPaymentDays(freq: string): string {
    const today = new Date();
    const d1 = new Date(today); d1.setDate(today.getDate() + 15);
    const d2 = new Date(today); d2.setDate(today.getDate() + 30);
    if (freq === "15_days") return `${d1.getDate()},${d2.getDate()}`;
    return `${d2.getDate()}`;
  }

  function handlePayFreqChange(freq: string) {
    setPayFreq(freq);
    setPayDays(calcPaymentDays(freq));
  }

  function handleMonthlyChange(val: number) {
    setMonthlyRate(val);
    setTiers(calcTiersFromMonthly(val));
  }

  function handleTierEdit(i: number, rate: number) {
    setTiers(prev => prev.map((t, j) => j === i ? { ...t, rate_per_day: rate } : t));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Override brand/model from state (controlled)
    fd.set("brand", brand);
    fd.set("model", model);
    fd.set("rate_tiers", JSON.stringify(tiers));
    startTransition(async () => {
      const result = await createVehicle(fd);
      if (result.error) { setError(result.error); return; }
      router.push(`/vehicles/${result.data.id}`);
    });
  }



  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Section: Basic Details */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">Vehicle Details</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Reg Number */}
          <div>
            <label className="form-label">Registration Number <span className="text-red-500">*</span></label>
            <input name="reg_number" required placeholder="e.g. ABC-1234" className="form-input uppercase" value={regNumber} onChange={e => setRegNumber(e.target.value.toUpperCase())} />
          </div>

          {/* Brand */}
          <div>
            <label className="form-label">Brand <span className="text-red-500">*</span></label>
            <select name="brand" className="form-select" value={brand} onChange={e => handleBrandChange(e.target.value)}>
              {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          {/* Model (dependent) */}
          <div>
            <label className="form-label">Model <span className="text-red-500">*</span></label>
            <select name="model" className="form-select" value={model} onChange={e => setModel(e.target.value)}>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="form-label">Year</label>
            <select name="year" className="form-select">
              <option value="">— Select Year —</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="form-label">Color</label>
            <select name="color" className="form-select">
              <option value="">— Select Color —</option>
              {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="form-label">Vehicle Type</label>
            <select name="type" className="form-select">
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="form-label">Source</label>
            <select name="source" className="form-select" value={source} onChange={e => setSource(e.target.value)}>
              <option value="Company">Company</option>
              <option value="Supplier">Supplier</option>
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label className="form-label">Supplier</label>
            <select name="supplier_id" className="form-select">
              <option value="">— No Supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Supplier Payment — only shown when source is Supplier */}
          {source === "Supplier" && (
            <>
              <div>
                <label className="form-label">Monthly Cost (Rs.)</label>
                <input name="monthly_cost" type="number" min="0" step="0.01" placeholder="e.g. 30000" className="form-input" />
              </div>
              <div>
                <label className="form-label">Payment Frequency</label>
                <select
                  name="payment_frequency"
                  className="form-select"
                  value={payFreq}
                  onChange={e => handlePayFreqChange(e.target.value)}
                >
                  <option value="1_month">1 Month</option>
                  <option value="15_days">15 Days</option>
                </select>
              </div>
              <div>
                <label className="form-label">Payment Day(s) of Month</label>
                <input
                  name="payment_days"
                  type="text"
                  readOnly
                  value={payDays}
                  placeholder="Select frequency to auto-fill"
                  className="form-input bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {payFreq === "15_days" ? "Two payments per month on these days" : "One payment per month on this day"}
                </p>
              </div>
            </>
          )}

          {/* KM Fields */}
          <div>
            <label className="form-label">Current KM</label>
            <input name="current_km" type="number" defaultValue="0" className="form-input" />
          </div>
          <div>
            <label className="form-label">Next Service KM</label>
            <input name="next_service_km" type="number" defaultValue="5000" className="form-input" />
          </div>

          {/* Dates */}
          <div>
            <label className="form-label">Next Service Date</label>
            <input name="next_service_date" type="date" className="form-input" />
          </div>
          <div>
            <label className="form-label">Insurance Expiry</label>
            <input name="insurance_expiry" type="date" className="form-input" />
          </div>
          <div>
            <label className="form-label">Revenue License Expiry</label>
            <input name="revenue_license_expiry" type="date" className="form-input" />
          </div>
          <div>
            <label className="form-label">Eco Test Expiry</label>
            <input name="eco_test_expiry" type="date" className="form-input" />
          </div>
        </div>

        {/* Notes */}
        <div className="px-5 pb-5">
          <label className="form-label">Notes</label>
          <textarea name="notes" rows={2} className="form-input resize-none" />
        </div>

        {/* Vehicle Photos Upload */}
        <div className="px-5 pb-5">
          <FileUploader
            label="Vehicle Photos (JPG/PNG, max 5MB per photo, up to 6)"
            bucket="vehicle-documents"
            folder={`${regNumber || 'vehicles/new'}/photos`}
            accept="image/*"
            multiple={true}
            maxFiles={6}
          />
        </div>

        {/* Vehicle Registration Document Upload */}
        <div className="px-5 pb-5">
          <FileUploader
            label="Vehicle Registration Document (JPG/PDF, max 5MB)"
            bucket="vehicle-documents"
            folder={`${regNumber || 'vehicles/new'}/registration`}
            accept=".jpg,.jpeg,.pdf"
            multiple={false}
            maxFiles={1}
            fieldName="registration_document"
          />
        </div>

        {/* Additional Documents Upload */}
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUploader
            label="Revenue License (JPG/PDF, max 5MB)"
            bucket="vehicle-documents"
            folder={`${regNumber || 'vehicles/new'}/revenue_license`}
            accept=".jpg,.jpeg,.pdf"
            multiple={false}
            maxFiles={1}
            fieldName="revenue_license"
          />
          <FileUploader
            label="Eco Test (JPG/PDF, max 5MB)"
            bucket="vehicle-documents"
            folder={`${regNumber || 'vehicles/new'}/eco_test`}
            accept=".jpg,.jpeg,.pdf"
            multiple={false}
            maxFiles={1}
            fieldName="eco_test"
          />
          <FileUploader
            label="Insurance (JPG/PDF, max 5MB)"
            bucket="vehicle-documents"
            folder={`${regNumber || 'vehicles/new'}/insurance`}
            accept=".jpg,.jpeg,.pdf"
            multiple={false}
            maxFiles={1}
            fieldName="insurance"
          />
          <FileUploader
            label="Service Tag (JPG/PDF, max 5MB)"
            bucket="vehicle-documents"
            folder={`${regNumber || 'vehicles/new'}/service_tag`}
            accept=".jpg,.jpeg,.pdf"
            multiple={false}
            maxFiles={1}
            fieldName="service_tag"
          />
        </div>
      </div>

      {/* Section: Rate Tiers */}
      <div className="section-card">
        <div className="section-card-header">
          <h2 className="section-card-title">Rate Tiers</h2>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-3 mb-5">
            <div className="flex-1 max-w-[200px]">
              <label className="form-label">Monthly Rate (LKR)</label>
              <input
                type="number"
                value={monthlyRate}
                onChange={e => handleMonthlyChange(+e.target.value)}
                className="form-input text-lg font-semibold"
                placeholder="e.g. 60000"
              />
            </div>
            <p className="text-xs text-gray-400 pb-2">Auto-calculates all 4 tiers below</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 mb-0.5">{tier.label}</p>
                  <p className="text-xs text-gray-400">
                    Days {tier.days_from}{tier.days_to ? `–${tier.days_to}` : "+"}
                  </p>
                </div>
                {editingTier === i ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tier.rate_per_day}
                      onChange={e => handleTierEdit(i, +e.target.value)}
                      className="form-input w-24 text-sm"
                      autoFocus
                    />
                    <button type="button" onClick={() => setEditingTier(null)} className="text-green-600">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      LKR {tier.rate_per_day.toLocaleString()}/day
                    </span>
                    <button type="button" onClick={() => setEditingTier(i)} className="text-gray-400 hover:text-blue-500">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 px-1">{error}</p>}

      <div className="flex justify-end gap-3">
        <Link href="/vehicles" className="btn-secondary">Cancel</Link>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? "Saving..." : "Add Vehicle"}
        </button>
      </div>
    </form>
  );
}