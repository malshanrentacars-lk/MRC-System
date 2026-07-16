"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Vehicle, Customer, Guarantor } from "@/types";
import { formatCurrency, calculateRentalAmount } from "@/lib/utils";
import { createRental, checkVehicleOverlap } from "@/app/actions/rentals";
import { AlertTriangle, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";

interface NewRentalClientProps {
  vehicles: Vehicle[];
  customers: Customer[];
  guarantors: Guarantor[];
}

export default function NewRentalClient({ vehicles, customers, guarantors }: NewRentalClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState(false);

  // Step 1 state
  const [vehicleId, setVehicleId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [guarantorId, setGuarantorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 2 state
  const [dailyRate, setDailyRate] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"booked" | "active">("booked");

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const selectedCustomer = customers.find(c => c.id === customerId);

  // Auto-calculate rate when vehicle and dates change
  useEffect(() => {
    if (selectedVehicle && startDate && endDate) {
      const { rateUsed } = calculateRentalAmount(startDate, endDate, selectedVehicle.daily_rate, selectedVehicle.rate_tiers);
      setDailyRate(rateUsed);
    }
  }, [selectedVehicle, startDate, endDate]);

  const { days, subtotal } = startDate && endDate && dailyRate > 0
    ? calculateRentalAmount(startDate, endDate, dailyRate)
    : { days: 0, subtotal: 0 };
  const total = subtotal + additionalCharges - discount;

  async function handleStep1Next() {
    if (!vehicleId || !customerId || !startDate || !endDate) {
      setError("Please fill in all required fields.");
      return;
    }
    if (startDate >= endDate) {
      setError("Return date must be after pickup date.");
      return;
    }

    // Check overlap
    startTransition(async () => {
      const overlaps = await checkVehicleOverlap(vehicleId, startDate, endDate);
      if (overlaps) {
        setOverlapWarning(true);
      } else {
        setOverlapWarning(false);
        setError(null);
        setStep(2);
      }
    });
  }

  async function handleSubmit() {
    startTransition(async () => {
      const result = await createRental({
        vehicle_id: vehicleId,
        customer_id: customerId,
        guarantor_id: guarantorId || undefined,
        start_date: startDate,
        end_date: endDate,
        daily_rate: dailyRate,
        deposit,
        additional_charges: additionalCharges,
        discount,
        notes,
        status,
      });

      if (result.error) { setError(result.error); return; }
      router.push(`/rentals/${result.data.id}`);
    });
  }

  return (
    <div className="section-card">
      {/* Step indicator */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <StepDot step={1} current={step} label="Vehicle & Customer" />
          <div className="flex-1 h-px bg-gray-100" />
          <StepDot step={2} current={step} label="Rates & Confirmation" />
        </div>
      </div>

      <div className="p-6">
        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Vehicle <span className="text-red-500">*</span></label>
                <select className="form-select" value={vehicleId} onChange={e => { setVehicleId(e.target.value); setOverlapWarning(false); }}>
                  <option value="">— Select a vehicle —</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.reg_number} — {v.brand} {v.model} ({formatCurrency(v.daily_rate)}/day)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Customer <span className="text-red-500">*</span></label>
                <select className="form-select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  <option value="">— Select a customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Guarantor (optional)</label>
                <select className="form-select" value={guarantorId} onChange={e => setGuarantorId(e.target.value)}>
                  <option value="">— None —</option>
                  {guarantors.map(g => <option key={g.id} value={g.id}>{g.name} ({g.phone})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Pickup Date <span className="text-red-500">*</span></label>
                <input type="date" className="form-input" value={startDate} onChange={e => { setStartDate(e.target.value); setOverlapWarning(false); }} />
              </div>
              <div>
                <label className="form-label">Return Date <span className="text-red-500">*</span></label>
                <input type="date" className="form-input" value={endDate} onChange={e => { setEndDate(e.target.value); setOverlapWarning(false); }} min={startDate || undefined} />
              </div>
            </div>

            {/* Duration preview */}
            {startDate && endDate && startDate < endDate && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  <strong>{days} days</strong> rental
                  {selectedVehicle && <> · Estimated: <strong>{formatCurrency(dailyRate)}/day</strong> = <strong>{formatCurrency(subtotal)}</strong></>}
                </span>
              </div>
            )}

            {/* Overlap warning */}
            {overlapWarning && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">This vehicle is already booked for the selected dates. Please choose different dates or vehicle.</span>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button onClick={handleStep1Next} disabled={isPending} className="btn-primary">
                {isPending ? "Checking..." : <>Next <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Vehicle</p><p className="font-medium">{selectedVehicle?.reg_number} — {selectedVehicle?.brand} {selectedVehicle?.model}</p></div>
              <div><p className="text-xs text-gray-400">Customer</p><p className="font-medium">{selectedCustomer?.name}</p></div>
              <div><p className="text-xs text-gray-400">Period</p><p className="font-medium">{startDate} → {endDate} ({days}d)</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Daily Rate (LKR) <span className="text-red-500">*</span></label>
                <input type="number" className="form-input" value={dailyRate} onChange={e => setDailyRate(+e.target.value)} />
                {selectedVehicle && <p className="text-xs text-gray-400 mt-1">Vehicle default: {formatCurrency(selectedVehicle.daily_rate)}</p>}
              </div>
              <div>
                <label className="form-label">Deposit (LKR)</label>
                <input type="number" className="form-input" value={deposit} onChange={e => setDeposit(+e.target.value)} />
              </div>
              <div>
                <label className="form-label">Additional Charges (LKR)</label>
                <input type="number" className="form-input" value={additionalCharges} onChange={e => setAdditionalCharges(+e.target.value)} />
              </div>
              <div>
                <label className="form-label">Discount (LKR)</label>
                <input type="number" className="form-input" value={discount} onChange={e => setDiscount(+e.target.value)} />
              </div>
              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value as "booked" | "active")}>
                  <option value="booked">Booked (future pickup)</option>
                  <option value="active">Active (pickup now)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea className="form-input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            {/* Total calculation */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal ({days}d × {formatCurrency(dailyRate)})</span><span>{formatCurrency(subtotal)}</span></div>
              {additionalCharges > 0 && <div className="flex justify-between"><span className="text-gray-600">Additional Charges</span><span>+{formatCurrency(additionalCharges)}</span></div>}
              {discount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-green-600">−{formatCurrency(discount)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-blue-200"><span>Total</span><span className="text-blue-700">{formatCurrency(total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Deposit</span><span>{formatCurrency(deposit)}</span></div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button onClick={handleSubmit} disabled={isPending} className="btn-primary">
                {isPending ? "Creating..." : "Create Rental"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? "bg-blue-600 text-white" : active ? "bg-blue-100 text-blue-700 ring-2 ring-blue-600 ring-offset-1" : "bg-gray-100 text-gray-400"}`}>
        {done ? <CheckCircle className="w-4 h-4" /> : step}
      </div>
      <span className={`text-sm font-medium ${active ? "text-blue-700" : "text-gray-500"}`}>{label}</span>
    </div>
  );
}
