"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Vehicle, Customer, Guarantor } from "@/types";
import { formatCurrency, calculateRentalAmount } from "@/lib/utils";
import { createRental, checkVehicleOverlap, getVehicleBookedRanges, getBookedDates } from "@/app/actions/rentals";
import { AlertTriangle, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";

interface NewRentalClientProps {
  vehicles: Vehicle[];
  customers: Customer[];
  guarantors: Guarantor[];
  activeCustomerIds: string[];
}

export default function NewRentalClient({ vehicles, customers, guarantors, activeCustomerIds }: NewRentalClientProps) {
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
  const [bookedRanges, setBookedRanges] = useState<{ start_date: string; end_date: string; status: string }[]>([]);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

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

  // Auto-check overlap when vehicle or dates change
  useEffect(() => {
    if (vehicleId && startDate && endDate && startDate < endDate) {
      checkVehicleOverlap(vehicleId, startDate, endDate).then(setOverlapWarning);
    } else {
      setOverlapWarning(false);
    }
  }, [vehicleId, startDate, endDate]);

  // Fetch booked ranges and dates when vehicle changes
  useEffect(() => {
    if (vehicleId) {
      getVehicleBookedRanges(vehicleId).then(setBookedRanges);
      getBookedDates(vehicleId).then(setBookedDates);
    } else {
      setBookedRanges([]);
      setBookedDates([]);
    }
  }, [vehicleId]);

  // Close pickers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (startRef.current && !startRef.current.contains(e.target as Node)) setShowStartPicker(false);
      if (endRef.current && !endRef.current.contains(e.target as Node)) setShowEndPicker(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { days, subtotal } = startDate && endDate && dailyRate > 0
    ? calculateRentalAmount(startDate, endDate, dailyRate)
    : { days: 0, subtotal: 0 };
  const total = subtotal + additionalCharges - discount;

  async function handleStep1Next() {
    if (!vehicleId || !customerId || !guarantorId || !startDate || !endDate) {
      setError("Please fill in all required fields.");
      return;
    }
    if (startDate >= endDate) {
      setError("Return date must be after pickup date.");
      return;
    }

    startTransition(async () => {
      const overlaps = await checkVehicleOverlap(vehicleId, startDate, endDate);
      if (overlaps) {
        setError("Selected dates overlap with an existing rental. Please choose different dates.");
        setOverlapWarning(true);
        return;
      }
      setOverlapWarning(false);
      setError(null);
      setStep(2);
    });
  }

  async function handleSubmit() {
    startTransition(async () => {
      const result = await createRental({
        vehicle_id: vehicleId,
        customer_id: customerId,
        guarantor_id: guarantorId,
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
    <div className="section-card overflow-visible">
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
                  {vehicles.map(v => {
                    const unavailable = v.status !== 'available';
                    const inGarage = v.status === 'in_garage';
                    return (
                      <option key={v.id} value={v.id} disabled={inGarage}
                        style={inGarage ? { color: '#9ca3af' } : unavailable ? { color: '#dc2626' } : undefined}>
                        {inGarage ? '🚫 ' : unavailable ? '⚠ ' : ''}{v.reg_number} — {v.brand} {v.model} ({formatCurrency(v.daily_rate)}/day){unavailable ? ` [${v.status}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="form-label">Customer <span className="text-red-500">*</span></label>
                <select className="form-select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  <option value="">— Select a customer —</option>
                  {customers.map(c => {
                    const hasActive = activeCustomerIds.includes(c.id);
                    return (
                      <option key={c.id} value={c.id} disabled={hasActive}
                        style={hasActive ? { color: '#9ca3af' } : undefined}>
                        {hasActive ? '🚫 ' : ''}{c.name} ({c.phone}){hasActive ? ' [Has Active Rental]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="form-label">Guarantor <span className="text-red-500">*</span></label>
                <select className="form-select" value={guarantorId} onChange={e => setGuarantorId(e.target.value)} required>
                  <option value="">— Select a guarantor —</option>
                  {guarantors.map(g => <option key={g.id} value={g.id}>{g.name} ({g.phone})</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div ref={startRef} className="relative">
                <label className="form-label">Pickup Date <span className="text-red-500">*</span></label>
                <input type="text" readOnly className="form-input cursor-pointer" value={startDate || 'Select date'} onClick={() => setShowStartPicker(!showStartPicker)} />
                {showStartPicker && (
                  <div className="absolute z-50 mt-1 bg-card border border-border rounded-xl shadow-lg p-2" style={{ width: '260px', fontSize: '0.75rem' }}>
                    <DayPicker mode="single" selected={startDate ? new Date(startDate + 'T12:00:00') : undefined}
                      onSelect={(d) => { if (d) { setStartDate(format(d, 'yyyy-MM-dd')); setShowStartPicker(false); } }}
                      disabled={[{ before: new Date() }, ...bookedDates]}
                      modifiers={{ booked: bookedDates }}
                      modifiersStyles={{ booked: { backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', textDecoration: 'line-through' } }}
                      styles={{ months: { width: '100%' }, table: { width: '100%' }, head_cell: { fontSize: '0.6rem', padding: '2px 0' }, cell: { width: '32px', height: '28px', padding: 0 }, day: { width: '26px', height: '26px', margin: '0 auto', borderRadius: '6px', fontSize: '0.72rem' }, nav_button: { width: '24px', height: '24px' }, caption_label: { fontSize: '0.75rem' }, caption: { padding: '2px 0 6px' } }} />
                  </div>
                )}
              </div>
              <div ref={endRef} className="relative">
                <label className="form-label">Return Date <span className="text-red-500">*</span></label>
                <input type="text" readOnly className="form-input cursor-pointer" value={endDate || 'Select date'} onClick={() => setShowEndPicker(!showEndPicker)} />
                {showEndPicker && (
                  <div className="absolute z-50 mt-1 bg-card border border-border rounded-xl shadow-lg p-2" style={{ width: '260px', fontSize: '0.75rem' }}>
                    <DayPicker mode="single" selected={endDate ? new Date(endDate + 'T12:00:00') : undefined}
                      onSelect={(d) => { if (d) { setEndDate(format(d, 'yyyy-MM-dd')); setShowEndPicker(false); } }}
                      disabled={[{ before: startDate ? new Date(startDate + 'T12:00:00') : new Date() }, ...bookedDates]}
                      modifiers={{ booked: bookedDates }}
                      modifiersStyles={{ booked: { backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', textDecoration: 'line-through' } }}
                      styles={{ months: { width: '100%' }, table: { width: '100%' }, head_cell: { fontSize: '0.6rem', padding: '2px 0' }, cell: { width: '32px', height: '28px', padding: 0 }, day: { width: '26px', height: '26px', margin: '0 auto', borderRadius: '6px', fontSize: '0.72rem' }, nav_button: { width: '24px', height: '24px' }, caption_label: { fontSize: '0.75rem' }, caption: { padding: '2px 0 6px' } }} />
                  </div>
                )}
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

            {/* Booked ranges for this vehicle */}
            {bookedRanges.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Existing bookings for this vehicle:</p>
                <ul className="space-y-0.5">
                  {bookedRanges.map((r, i) => (
                    <li key={i} className="text-xs text-amber-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {r.start_date} — {r.end_date}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.status}
                      </span>
                    </li>
                  ))}
                </ul>
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
