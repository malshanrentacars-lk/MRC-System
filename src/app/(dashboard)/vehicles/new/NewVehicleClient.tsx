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

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [payFreq, setPayFreq] = useState("1_month");
  const [payDaysLocked, setPayDaysLocked] = useState(true);
  const today = new Date();
  const [payDay1, setPayDay1] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30).getDate());
  const [payDay2, setPayDay2] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15).getDate());
  const [regNumber, setRegNumber] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const filteredSuppliers = supplierSearch
    ? suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
    : suppliers;
  const [currentKm, setCurrentKm] = useState(0);
  const [lastServiceKm, setLastServiceKm] = useState(0);
  const [nextServiceKm, setNextServiceKm] = useState<number | string>("");
  const [serviceInterval, setServiceInterval] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");

  // Rate tiers
  const [monthlyRate, setMonthlyRate] = useState<number | string>("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [editingTier, setEditingTier] = useState<number | null>(null);

  function handleBrandChange(b: string) {
    setBrand(b);
    const m = getModels(b);
    setModels(m);
    setModel(b ? m[0] : "");
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
    if (payDaysLocked) {
      const days = calcPaymentDays(freq).split(',');
      setPayDay1(parseInt(days[0]));
      if (days[1]) setPayDay2(parseInt(days[1]));
    }
  }

  function handleMonthlyChange(val: number) {
    setMonthlyRate(val || "");
    setTiers(val ? calcTiersFromMonthly(val) : []);
  }

  function handleTierEdit(i: number, rate: number) {
    setTiers(prev => prev.map((t, j) => j === i ? { ...t, rate_per_day: rate } : t));
  }

  function calcNextServiceDate(lastDate: string, interval: string) {
    if (!lastDate || !interval) return "";
    const date = new Date(lastDate + "T00:00:00");
    if (isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + parseInt(interval) / 100);
    return date.toISOString().split("T")[0];
  }

  function handleLastServiceKmChange(km: number) {
    setLastServiceKm(km);
    if (serviceInterval) setNextServiceKm(km + parseInt(serviceInterval));
  }

  function handleLastServiceDateChange(date: string) {
    setLastServiceDate(date);
    setNextServiceDate(calcNextServiceDate(date, serviceInterval));
  }

  function handleServiceIntervalChange(interval: string) {
    setServiceInterval(interval);
    if (interval) {
      setNextServiceKm(lastServiceKm + parseInt(interval));
      setNextServiceDate(calcNextServiceDate(lastServiceDate, interval));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const revLic = (fd.get("revenue_license_url") as string) || "";
    const insurance = (fd.get("insurance_url") as string) || "";
    const fuelType = (fd.get("fuel_type") as string) || "";
    if (!revLic || !insurance) {
      setError("Please upload Revenue License and Insurance.");
      return;
    }
    const ecoTest = (fd.get("eco_test_url") as string) || "";
    if ((fuelType === "Petrol" || fuelType === "Diesel") && !ecoTest) {
      setError("Please upload Eco Test document (required for Petrol/Diesel vehicles).");
      return;
    }

    // Override brand/model from state (controlled)
    fd.set("brand", brand);
    fd.set("model", model);
    fd.set("rate_tiers", JSON.stringify(tiers));
    setError(null);
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
            <input name="reg_number" required placeholder="e.g. ABC-1234" className="form-input uppercase" value={regNumber} onChange={e => {
              const cleaned = e.target.value.replace(/-/g, "").toUpperCase();
              const match = cleaned.match(/^([A-Z]*)(\d*)$/);
              if (!match) { setRegNumber(cleaned); return; }
              const letters = match[1], numbers = match[2];
              setRegNumber(letters && numbers ? `${letters}-${numbers}` : letters || numbers);
            }} />
          </div>

          {/* Brand */}
          <div>
            <label className="form-label">Brand <span className="text-red-500">*</span></label>
            <select name="brand" required className="form-select" value={brand} onChange={e => handleBrandChange(e.target.value)}>
              <option value="">— Select Brand —</option>
              {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          {/* Model (dependent) */}
          <div>
            <label className="form-label">Model <span className="text-red-500">*</span></label>
            <select name="model" required className="form-select" value={model} onChange={e => setModel(e.target.value)}>
              <option value="">— Select Model —</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="form-label">Year <span className="text-red-500">*</span></label>
            <select name="year" required className="form-select">
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
            <label className="form-label">Vehicle Type <span className="text-red-500">*</span></label>
            <select name="type" required className="form-select">
              <option value="">— Select Type —</option>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Fuel Type */}
          <div>
            <label className="form-label">Fuel Type <span className="text-red-500">*</span></label>
            <select name="fuel_type" required className="form-select" value={fuelType} onChange={e => setFuelType(e.target.value)}>
              <option value="">— Select Fuel Type —</option>
              {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Transmission */}
          <div>
            <label className="form-label">Transmission <span className="text-red-500">*</span></label>
            <select name="transmission" required className="form-select">
              <option value="">— Select —</option>
              {TRANSMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="form-label">Source <span className="text-red-500">*</span></label>
            <select name="source" required className="form-select" value={source} onChange={e => setSource(e.target.value)}>
              <option value="">— Select Source —</option>
              <option value="Company">Company</option>
              <option value="Supplier">Supplier</option>
            </select>
          </div>

          {/* Supplier — only shown when source is Supplier */}
          {source === "Supplier" && (
            <div className="relative">
              <label className="form-label">Supplier <span className="text-red-500">*</span></label>
              <input type="hidden" name="supplier_id" value={selectedSupplierId} />
              <input
                type="text"
                value={selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId)?.name || "" : supplierSearch}
                onChange={e => { setSupplierSearch(e.target.value); setSelectedSupplierId(""); setShowSupplierDropdown(true); }}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                placeholder="Search supplier..."
                required
                autoComplete="off"
                className="form-input"
              />
              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuppliers.map(s => (
                    <div
                      key={s.id}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                      onMouseDown={() => { setSelectedSupplierId(s.id); setSupplierSearch(""); setShowSupplierDropdown(false); }}
                    >
                      {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Supplier Payment — only shown when source is Supplier */}
          {source === "Supplier" && (
            <>
              <div>
                <label className="form-label">Monthly Cost (Rs.) <span className="text-red-500">*</span></label>
                <input name="monthly_cost" type="number" min="0" step="0.01" placeholder="e.g. 30000" required className="form-input" />
              </div>
              <div>
                <label className="form-label">Payment Frequency <span className="text-red-500">*</span></label>
                <select
                  name="payment_frequency"
                  required
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
                <input type="hidden" name="payment_days" value={payFreq === "15_days" ? `${payDay1},${payDay2}` : `${payDay1}`} />
                {payDaysLocked ? (
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={payFreq === "15_days" ? `${payDay1}, ${payDay2}` : `${payDay1}`} className="form-input bg-gray-50 text-gray-500 cursor-not-allowed flex-1" />
                    <button type="button" onClick={() => setPayDaysLocked(false)} className="p-2 text-gray-400 hover:text-blue-600 flex-shrink-0" title="Edit payment days">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {payFreq === "15_days" ? (
                      <>
                        <select value={payDay1} onChange={e => setPayDay1(parseInt(e.target.value))} className="form-select w-[80px]">
                          {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <span className="text-gray-400">,</span>
                        <select value={payDay2} onChange={e => setPayDay2(parseInt(e.target.value))} className="form-select w-[80px]">
                          {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </>
                    ) : (
                      <select value={payDay1} onChange={e => setPayDay1(parseInt(e.target.value))} className="form-select w-[90px] flex-1">
                        {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => setPayDaysLocked(true)} className="p-2 text-blue-600 hover:text-gray-400 flex-shrink-0" title="Lock">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {payFreq === "15_days" ? "Two payments per month on these days" : "One payment per month on this day"}
                </p>
              </div>
            </>
          )}

          {/* KM Fields */}
          <div>
            <label className="form-label">Current KM <span className="text-red-500">*</span></label>
            <input name="current_km" type="number" required className="form-input" onChange={e => setCurrentKm(parseInt(e.target.value) || 0)} />
          </div>

          {/* Dates */}
          <div>
            <label className="form-label">Last Service Date <span className="text-red-500">*</span></label>
            <input name="last_service_date" type="date" required className="form-input" value={lastServiceDate} onChange={e => handleLastServiceDateChange(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Last Service KM <span className="text-red-500">*</span></label>
            <input name="last_service_km" type="number" required className="form-input" value={lastServiceKm || ""} onChange={e => handleLastServiceKmChange(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className="form-label">Service Interval <span className="text-red-500">*</span></label>
            <select required className="form-select" value={serviceInterval} onChange={e => handleServiceIntervalChange(e.target.value)}>
              <option value="">— Select —</option>
              <option value="3000">3,000 KM</option>
              <option value="5000">5,000 KM</option>
              <option value="7000">7,000 KM</option>
              <option value="10000">10,000 KM</option>
            </select>
          </div>
          <div>
            <label className="form-label">Next Service KM <span className="text-red-500">*</span></label>
            <input name="next_service_km" type="number" required value={nextServiceKm} onChange={e => setNextServiceKm(parseInt(e.target.value) || 0)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Next Service Date <span className="text-red-500">*</span></label>
            <input name="next_service_date" type="date" required className="form-input" value={nextServiceDate} onChange={e => setNextServiceDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Insurance Expiry <span className="text-red-500">*</span></label>
            <input name="insurance_expiry" type="date" required className="form-input" />
          </div>
          <div>
            <label className="form-label">Revenue License Expiry <span className="text-red-500">*</span></label>
            <input name="revenue_license_expiry" type="date" required className="form-input" />
          </div>
          <div>
            <label className="form-label">Eco Test Expiry</label>
            <input name="eco_test_expiry" type="date" className="form-input" />
          </div>
          <div>
            <label className="form-label">Rental Start Date <span className="text-red-500">*</span></label>
            <input name="rental_start_date" type="date" required className="form-input" />
          </div>
          <div>
            <label className="form-label">Renew Date <span className="text-red-500">*</span></label>
            <input name="renew_date" type="date" required className="form-input" />
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
            fieldName="vehicle_photos"
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
            label="Revenue License (JPG/PDF, max 5MB) *"
            bucket="vehicle-documents"
            folder={`${regNumber || 'vehicles/new'}/revenue_license`}
            accept=".jpg,.jpeg,.pdf"
            multiple={false}
            maxFiles={1}
            fieldName="revenue_license"
          />
          <FileUploader
            label={`Eco Test (JPG/PDF, max 5MB)${fuelType === "Petrol" || fuelType === "Diesel" ? " *" : ""}`}
            bucket="vehicle-documents"
            folder={`${regNumber || 'vehicles/new'}/eco_test`}
            accept=".jpg,.jpeg,.pdf"
            multiple={false}
            maxFiles={1}
            fieldName="eco_test"
          />
          <FileUploader
            label="Insurance (JPG/PDF, max 5MB) *"
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
              <label className="form-label">Monthly Rate (LKR) <span className="text-red-500">*</span></label>
              <input
                type="number"
                required
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