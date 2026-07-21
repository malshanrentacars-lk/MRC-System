"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Rental, Vehicle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatAddress } from "@/lib/address";
import { activateRental, returnRental, exchangeVehicle, cancelRental, uploadSignedAgreement, recordRentalPayment, removeSignedAgreement } from "@/app/actions/rentals";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
import DocumentViewer from "@/components/shared/DocumentViewer";
import StatusBadge from "@/components/shared/StatusBadge";
import RentalActionsCard from "@/components/rentals/RentalActionsCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle, ArrowLeftRight, RotateCcw, XCircle,
  User, Car, FileText, ClipboardList, Activity, Shield,
  Upload, X, Camera, Loader2
} from "lucide-react";

interface Props {
  rental: Rental;
  availableVehicles: Vehicle[];
}

type InspectionCheck = {
  body_damage: boolean;
  interior: boolean;
  tyres: boolean;
  engine: boolean;
};

export default function RentalDetailClient({ rental: initial, availableVehicles }: Props) {
  const router = useRouter();
  const rental = initial;
  const [showActivate, setShowActivate] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [docViewer, setDocViewer] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });

  // Return form
  const [returnKm, setReturnKm] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().substring(0, 10));
  const [returnCharges, setReturnCharges] = useState("0");
  const [returnNotes, setReturnNotes] = useState("");

  // Activate form
  const [pickupKm, setPickupKm] = useState(rental.pickup_km?.toString() ?? "0");

  // Exchange form
  const [exchangeVehicleId, setExchangeVehicleId] = useState("");
  const [exchangeDate, setExchangeDate] = useState(new Date().toISOString().substring(0, 10));
  const [exchangeReason, setExchangeReason] = useState("");
  const [exchangeCharge, setExchangeCharge] = useState("0");

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [agreementUrl, setAgreementUrl] = useState(rental.signed_agreement_url ?? "");
  const [agreementPath, setAgreementPath] = useState(rental.signed_agreement_path ?? "");

  // Inspection state
  const [inspection, setInspection] = useState<InspectionCheck>({
    body_damage: false, interior: false, tyres: false, engine: false,
  });
  const [inspectionFeedback, setInspectionFeedback] = useState("");
  const [inspectionImages, setInspectionImages] = useState<{ name: string; url: string }[]>([]);
  const [inspectionSaved, setInspectionSaved] = useState(false);
  const [inspectionInputKey, setInspectionInputKey] = useState(0);
  const agreementFileInputId = `signed-agreement-upload-${rental.id}`;

  const appliedRate = Number(rental.applied_rate ?? rental.daily_rate ?? 0);
  const rentalDuration = Number(rental.rental_duration ?? rental.total_days ?? 1);
  const baseAmount = Number(rental.subtotal ?? appliedRate * rentalDuration);
  const extraCharges = Number(rental.additional_charges ?? 0);
  const discount = Number(rental.discount ?? 0);
  const finalAmount = Number(rental.total_amount ?? (baseAmount + extraCharges - discount));
  const advancePaid = Number((rental as Rental & { amount_paid?: number }).amount_paid ?? rental.advance_paid ?? 0);
  const securityDepositAmount = Number(rental.security_deposit_amount ?? rental.deposit ?? 0);
  const depositApplied = rental.is_deposit_collected === false ? 0 : securityDepositAmount;
  const netBalance = Number((finalAmount - (advancePaid + depositApplied)).toFixed(2));
  const refundDue = netBalance < 0 ? Math.abs(netBalance) : Number(rental.refund_amount_due ?? 0);
  const balanceDue = netBalance > 0 ? netBalance : 0;

  function confirmWithPassword(action: () => Promise<void>, label: string) {
    setPendingAction(() => action);
    setConfirmAction(label);
  }

  function handleActivate() {
    confirmWithPassword(async () => {
      await activateRental(rental.id, parseInt(pickupKm));
      router.refresh();
    }, "Activate Rental");
  }

  function handleReturn() {
    confirmWithPassword(async () => {
      await returnRental(rental.id, {
        return_km: parseInt(returnKm),
        actual_return_date: returnDate,
        additional_charges: parseFloat(returnCharges) || 0,
        return_notes: returnNotes,
      });
      router.refresh();
    }, "Return Vehicle");
  }

  function handleCancel() {
    confirmWithPassword(async () => {
      await cancelRental(rental.id);
      router.refresh();
    }, "Cancel Rental");
  }

  async function handleAgreementUpload(file: File) {
    const result = await uploadSignedAgreement(rental.id, file) as { error?: string; url?: string; path?: string };
    if (result.error || !result.url || !result.path) {
      setError(result.error ?? "Upload failed");
      return { error: result.error ?? "Upload failed" };
    }
    setError(null);
    setAgreementUrl(result.url);
    setAgreementPath(result.path);
    router.refresh();
    return { url: result.url, path: result.path };
  }

  async function handleAgreementDelete() {
    if (!agreementUrl) {
      setError('No agreement selected');
      return;
    }
    const result = await removeSignedAgreement(rental.id) as { error?: string };
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setAgreementUrl("");
    setAgreementPath("");
    router.refresh();
  }

  async function handleRecordPayment() {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    setError(null);

    const result = await recordRentalPayment(rental.id, {
      amount,
      method: paymentMethod,
      notes: paymentNotes || undefined,
    }) as { error?: string; payment_status?: string; amount_paid?: number };

    if (result.error) {
      setError(result.error);
      return;
    }

    setPaymentAmount("");
    setPaymentNotes("");
    router.refresh();
  }

  async function handleExchange() {
    if (!exchangeVehicleId) { setError("Please select a replacement vehicle."); return; }
    setError(null);
    confirmWithPassword(async () => {
      const result = await exchangeVehicle({
        rental_id: rental.id,
        old_vehicle_id: rental.vehicle_id,
        new_vehicle_id: exchangeVehicleId,
        exchange_date: exchangeDate,
        reason: exchangeReason || undefined,
        additional_charge: parseFloat(exchangeCharge) || 0,
      }) as any;
      if (result?.error) { setError(result.error); return; }
      setShowExchange(false);
      router.refresh();
    }, "Exchange Vehicle");
  }

  function handleInspectionImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inspectionImages.length >= 2) return;
    const url = URL.createObjectURL(file);
    setInspectionImages(prev => [...prev, { name: file.name, url }]);
    // Reset the input so same file can be re-selected after deleting
    setInspectionInputKey(k => k + 1);
  }

  function removeInspectionImage(i: number) {
    setInspectionImages(prev => prev.filter((_, j) => j !== i));
    setInspectionInputKey(k => k + 1);
  }

  function saveInspection() {
    // For now, store in local state (cloud storage integration pending)
    setInspectionSaved(true);
    setTimeout(() => setInspectionSaved(false), 3000);
  }

  // Action buttons for header
  const actionButtons = (
    <div className="flex gap-2 flex-wrap">
      {rental.status === "booked" && (
        <button onClick={() => setShowActivate(true)} className="btn-primary text-xs">
          <CheckCircle className="w-3.5 h-3.5" /> Activate
        </button>
      )}
      {rental.status === "active" && (
        <>
          <button onClick={() => setShowExchange(true)} className="btn-secondary text-xs">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Exchange
          </button>
          <button onClick={() => setShowReturn(true)} className="btn-primary text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Return
          </button>
        </>
      )}
      {(rental.status === "booked" || rental.status === "active") && (
        <button onClick={handleCancel} className="btn-danger text-xs">
          <XCircle className="w-3.5 h-3.5" /> Cancel
        </button>
      )}
    </div>
  );

  return (
    <div>
      <Tabs defaultValue="details">
        <div className="section-card overflow-hidden bg-white border border-gray-200 shadow-sm">
          <div className="px-5 pt-4 flex items-center justify-between gap-4 flex-wrap border-b border-gray-200 pb-0 bg-white">
            <TabsList className="border-b-0">
              <TabsTrigger value="details"><FileText className="w-3.5 h-3.5 mr-1.5 inline" />Details</TabsTrigger>
              <TabsTrigger value="vehicle"><Car className="w-3.5 h-3.5 mr-1.5 inline" />Vehicle</TabsTrigger>
              <TabsTrigger value="guarantor"><User className="w-3.5 h-3.5 mr-1.5 inline" />Customer</TabsTrigger>
              <TabsTrigger value="inspection"><ClipboardList className="w-3.5 h-3.5 mr-1.5 inline" />Inspection</TabsTrigger>
              <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 mr-1.5 inline" />Documents</TabsTrigger>
              <TabsTrigger value="activity"><Activity className="w-3.5 h-3.5 mr-1.5 inline" />Activity Log</TabsTrigger>
            </TabsList>
            <div className="mb-2">{actionButtons}</div>
          </div>

          {/* ── DETAILS TAB ── */}
          <TabsContent value="details" className="mt-0">
            <div className="p-5">
              {/* Payment status banner */}
              {netBalance !== 0 &&
                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700">
                  {netBalance > 0 ? `Balance Due: ${formatCurrency(balanceDue)}` : `Refund Due: ${formatCurrency(refundDue)}`}
                </div>
              }

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left column */}
                <div className="md:col-span-8 space-y-4">
                  {/* Info card */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {[
                        { label: "Rental #", value: rental.rental_number },
                        { label: "Status", value: <StatusBadge status={rental.status} /> },
                        { label: "Payment", value: <StatusBadge status={rental.payment_status} /> },
                        { label: "Pickup Date", value: formatDate(rental.start_date) },
                        { label: "Return Date", value: formatDate(rental.end_date) },
                        { label: "Actual Return", value: rental.actual_return_date ? formatDate(rental.actual_return_date) : "—" },
                        { label: "Total Days", value: `${rental.total_days}d` },
                        { label: "Pickup KM", value: `${rental.pickup_km?.toLocaleString() ?? 0} km` },
                        { label: "Return KM", value: rental.return_km ? `${rental.return_km.toLocaleString()} km` : "—" },
                        { label: "Daily Rate", value: formatCurrency(rental.daily_rate) },
                      ].map((f: any) => (
                        <div key={f.label}>
                          <p className="text-[11px] text-gray-400 mb-0.5">{f.label}</p>
                          <div className="text-sm font-semibold text-gray-900">{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-[11px] text-gray-400 mb-1">Vehicle</p>
                        <Link href={`/vehicles/${rental.vehicle_id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline">{rental.vehicle?.brand} {rental.vehicle?.model}</Link>
                        <p className="text-xs text-gray-500">{rental.vehicle?.reg_number}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 mb-1">Customer</p>
                        <Link href={`/customers/${rental.customer_id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline">{rental.customer?.name}</Link>
                        <p className="text-xs text-gray-500">{rental.customer?.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing card */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Pricing</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount ({formatCurrency(rental.daily_rate)} &times; {rental.total_days}d)</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(rental.total_amount ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Advance Paid</span>
                        <span className="text-gray-500">- {formatCurrency(rental.advance_paid ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deposit</span>
                        <span className="text-gray-500">- {formatCurrency(rental.deposit ?? 0)}</span>
                      </div>
                      {extraCharges > 0 && (
                        <div className="flex justify-between"><span className="text-gray-500">Extra Charges</span><span className="text-gray-600">+ {formatCurrency(extraCharges)}</span></div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-gray-600">- {formatCurrency(discount)}</span></div>
                      )}
                      {netBalance !== 0 && (
                        <div className="flex justify-between pt-3 border-t font-semibold">
                          <span className="text-gray-900">{netBalance > 0 ? "Balance Due" : "Refund Due"}</span>
                          <span className="text-gray-900">{formatCurrency(netBalance > 0 ? balanceDue : refundDue)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exchange History */}
                  {(rental.exchanges ?? []).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Vehicle Exchanges</p>
                      <div className="space-y-2">
                        {[...(rental.exchanges ?? [])]
                          .sort((a, b) => new Date(b.exchange_date).getTime() - new Date(a.exchange_date).getTime())
                          .map((ex, idx) => (
                            <div key={ex.id} className="flex items-center gap-3 text-sm text-gray-600">
                              {idx === 0 && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">Current</span>}
                              <span>{ex.old_vehicle?.reg_number}</span>
                              <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium text-gray-900">{ex.new_vehicle?.reg_number}</span>
                              <span className="text-xs text-gray-400 ml-auto">{formatDate(ex.exchange_date)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="md:col-span-4 space-y-4">
                  <RentalActionsCard rental={rental} availableVehicles={availableVehicles} />

                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500 font-medium">Signed Agreement</p>
                      <label htmlFor={agreementFileInputId} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 cursor-pointer ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        Upload PDF
                      </label>
                      <input
                        id={agreementFileInputId}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={isPending}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          const lowerName = file.name.toLowerCase();
                          const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
                          if (!isPdf) { setError("Only PDF files are allowed."); return; }
                          if (file.size > 5 * 1024 * 1024) { setError("File size must be 5MB or less."); return; }
                          await handleAgreementUpload(file);
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">PDF files only, max 5MB.</p>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    {agreementUrl ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm">Signed Agreement PDF</p>
                            <p className="text-xs text-gray-400 truncate">{agreementPath || "Uploaded file"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a href="#" onClick={(e) => { e.preventDefault(); setDocViewer({ open: true, url: agreementUrl, title: 'Signed Agreement PDF' }); }}
                            className="flex-1 text-center rounded py-1.5 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">
                            View PDF
                          </a>
                          <button type="button" onClick={() => handleAgreementDelete()}
                            className="rounded py-1.5 px-4 border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50">
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                        No signed agreement uploaded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── VEHICLE TAB ── */}
          <TabsContent value="vehicle" className="mt-0">
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Rented Vehicle</p>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Car className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <Link href={`/vehicles/${rental.vehicle_id}`} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline">
                      {rental.vehicle?.brand} {rental.vehicle?.model}
                    </Link>
                    <p className="text-xs text-gray-500">{rental.vehicle?.reg_number}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Registration", value: rental.vehicle?.reg_number ?? "—" },
                    { label: "Brand", value: rental.vehicle?.brand ?? "—" },
                    { label: "Model", value: rental.vehicle?.model ?? "—" },
                    { label: "Year", value: rental.vehicle?.year?.toString() ?? "—" },
                    { label: "Type", value: rental.vehicle?.type ?? "—" },
                    { label: "Fuel Type", value: rental.vehicle?.fuel_type ?? "—" },
                    { label: "Transmission", value: rental.vehicle?.transmission ?? "—" },
                    { label: "Color", value: rental.vehicle?.color ?? "—" },
                    { label: "Status", value: <StatusBadge status={rental.vehicle?.status ?? "available"} /> },
                  ].map((f: any) => (
                    <div key={f.label}>
                      <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                      <div className="text-sm font-medium text-gray-900">{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── INSPECTION TAB ── */}
          <TabsContent value="inspection" className="mt-0">
            <div className="p-5 space-y-6">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Vehicle Condition Checks</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { key: "body_damage", label: "Body Damage Check", desc: "Scratches, dents, paint issues" },
                    { key: "interior", label: "Interior Check", desc: "Seats, dashboard, cleanliness" },
                    { key: "tyres", label: "Tyres Check", desc: "Tread depth, pressure, spare" },
                    { key: "engine", label: "Engine Compartment", desc: "Oil, coolant, belts, leaks" },
                  ] as { key: keyof InspectionCheck; label: string; desc: string }[]).map(item => (
                    <label key={item.key}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        inspection[item.key]
                          ? "border-green-400 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}>
                      <div className="mt-0.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          inspection[item.key] ? "bg-green-500 border-green-500" : "border-gray-300"
                        }`}>
                          {inspection[item.key] && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={inspection[item.key]}
                        onChange={e => setInspection(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Inspection Feedback / Remarks</label>
                <textarea
                  className="form-input resize-none"
                  rows={4}
                  placeholder="Describe any damage, issues, or notes from the inspection..."
                  value={inspectionFeedback}
                  onChange={e => setInspectionFeedback(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="form-label mb-0">Inspection Media</p>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{inspectionImages.length}/2 files</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {inspectionImages.map((img, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden bg-gray-100 group border border-gray-200">
                      {img.name.toLowerCase().endsWith(".pdf") ? (
                        <div className="flex flex-col items-center justify-center py-6 px-3">
                          <span className="text-3xl mb-1">📄</span>
                          <p className="text-xs text-gray-600 text-center truncate w-full">{img.name}</p>
                        </div>
                      ) : (
                        <img src={img.url} alt={`Inspection ${i + 1}`} className="w-full aspect-video object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeInspectionImage(i)}
                        className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {inspectionImages.length < 2 && (
                    <label className="rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors py-8">
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">Add Photo / PDF</span>
                      <span className="text-[10px] text-gray-400">Max 2 files</span>
                      <input key={inspectionInputKey} type="file" accept="image/*,.pdf" className="hidden" onChange={handleInspectionImageUpload} />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                {inspectionSaved && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Saved!
                  </span>
                )}
                <button type="button" onClick={saveInspection} className="btn-primary text-sm">
                  <CheckCircle className="w-4 h-4" /> Save Inspection Report
                </button>
              </div>
            </div>
          </TabsContent>

          {/* ── GUARANTOR TAB ── */}
          <TabsContent value="guarantor" className="mt-0">
            <div className="p-5 space-y-5">
              {/* Customer — primary focus */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Customer</p>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <Link href={`/customers/${rental.customer_id}`} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline">{rental.customer?.name}</Link>
                      <p className="text-xs text-gray-500">{rental.customer?.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: "NIC", value: rental.customer?.nic ?? "—" },
                      { label: "Email", value: rental.customer?.email ?? "—" },
                      { label: "Phone", value: rental.customer?.phone ?? "—" },
                      { label: "Alt Phone", value: rental.customer?.phone2 ?? "—" },
                      { label: "Address", value: formatAddress(rental.customer) },
                      { label: "License No", value: rental.customer?.license_number ?? "—" },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                        <p className="text-sm font-medium text-gray-900">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Guarantor — secondary */}
              {rental.guarantor ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Guarantor</p>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <Link href={`/guarantors/${rental.guarantor_id}`} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline">{rental.guarantor.name}</Link>
                        <p className="text-xs text-gray-500">{rental.guarantor.relationship ?? "Guarantor"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "NIC", value: rental.guarantor.nic ?? "—" },
                        { label: "Phone", value: rental.guarantor.phone ?? "—" },
                        { label: "Alt Phone", value: rental.guarantor.phone2 ?? "—" },
                        { label: "Relationship", value: rental.guarantor.relationship ?? "—" },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                          <p className="text-sm font-medium text-gray-900">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Guarantor</p>
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                    <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No guarantor assigned to this rental.</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── DOCUMENTS TAB ── */}
          <TabsContent value="documents" className="mt-0">
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Documents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rental Agreement */}
                <div className="border border-gray-200 rounded-xl p-4 flex items-start gap-4 hover:border-blue-300 transition-colors">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">Rental Agreement</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rental.rental_number}</p>
                    <a href={`/agreements/${rental.id}`} target="_blank" rel="noopener"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline font-medium">
                      View / Print →
                    </a>
                  </div>
                </div>

                {/* Inspection Report */}
                <div className="border border-gray-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">Inspection Report</p>
                    <p className="text-xs text-gray-400 mt-0.5">Vehicle condition at handover</p>
                    <p className="text-xs text-gray-400 mt-2">Complete inspection tab first</p>
                  </div>
                </div>

                {/* Upload area */}
                <label className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                  <Upload className="w-6 h-6 text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">Upload Document</p>
                  <p className="text-xs text-gray-400">PDF, JPG, PNG up to 10MB</p>
                  <input type="file" className="hidden" accept=".pdf,image/*" />
                </label>
              </div>
            </div>
          </TabsContent>

          {/* ── ACTIVITY LOG TAB ── */}
          <TabsContent value="activity" className="mt-0">
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Activity History</p>
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4 pl-8">
                  {/* Derived activity from rental data */}
                  {[
                    {
                      date: rental.created_at,
                      title: "Rental Created",
                      desc: `Rental ${rental.rental_number} created with status: ${rental.status}`,
                      color: "bg-blue-500",
                    },
                    rental.status === "active" ? {
                      date: rental.start_date,
                      title: "Vehicle Activated",
                      desc: `Vehicle ${rental.vehicle?.reg_number} picked up at ${rental.pickup_km?.toLocaleString() ?? 0} km`,
                      color: "bg-green-500",
                    } : null,
                    ...(rental.exchanges ?? []).map(ex => ({
                      date: ex.exchange_date,
                      title: "Vehicle Exchanged",
                      desc: `${ex.old_vehicle?.reg_number} → ${ex.new_vehicle?.reg_number}${ex.reason ? ` (${ex.reason})` : ""}`,
                      color: "bg-amber-500",
                    })),
                    rental.status === "returned" ? {
                      date: rental.actual_return_date ?? rental.end_date,
                      title: "Vehicle Returned",
                      desc: `Returned at ${rental.return_km?.toLocaleString() ?? "—"} km. ${rental.return_notes ?? ""}`,
                      color: "bg-purple-500",
                    } : null,
                    rental.status === "cancelled" ? {
                      date: rental.updated_at,
                      title: "Rental Cancelled",
                      desc: "Rental was cancelled.",
                      color: "bg-red-500",
                    } : null,
                  ]
                    .filter(Boolean)
                    .sort((a, b) => new Date(b!.date ?? 0).getTime() - new Date(a!.date ?? 0).getTime())
                    .map((item, i) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-5 w-2.5 h-2.5 rounded-full ${item!.color} ring-2 ring-white`} />
                        <div className="bg-gray-50 rounded-lg px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">{item!.title}</p>
                            <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(item!.date)}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{item!.desc}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* ── MODALS ── */}
      {showActivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Activate Rental</h3>
            <label className="form-label">Pickup KM</label>
            <input type="number" className="form-input mb-4" value={pickupKm} onChange={e => setPickupKm(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowActivate(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={() => { setShowActivate(false); handleActivate(); }} className="btn-primary text-sm">Activate</button>
            </div>
          </div>
        </div>
      )}

      {showReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-gray-900">Return Vehicle</h3>
            <div><label className="form-label">Return KM</label><input type="number" className="form-input" value={returnKm} onChange={e => setReturnKm(e.target.value)} /></div>
            <div><label className="form-label">Return Date</label><input type="date" className="form-input" value={returnDate} onChange={e => setReturnDate(e.target.value)} /></div>
            <div><label className="form-label">Additional Charges (LKR)</label><input type="number" className="form-input" value={returnCharges} onChange={e => setReturnCharges(e.target.value)} /></div>
            <div><label className="form-label">Notes</label><textarea className="form-input resize-none" rows={2} value={returnNotes} onChange={e => setReturnNotes(e.target.value)} /></div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowReturn(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={() => { setShowReturn(false); handleReturn(); }} className="btn-primary text-sm">Confirm Return</button>
            </div>
          </div>
        </div>
      )}

      {showExchange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900">Exchange Vehicle</h3>
            <p className="text-xs text-gray-500">Current: <strong>{rental.vehicle?.reg_number}</strong> — {rental.vehicle?.brand} {rental.vehicle?.model}</p>
            <div>
              <label className="form-label">New Vehicle <span className="text-red-500">*</span></label>
              <select className="form-select" value={exchangeVehicleId} onChange={e => setExchangeVehicleId(e.target.value)}>
                <option value="">— Select available vehicle —</option>
                {availableVehicles.filter(v => v.id !== rental.vehicle_id).map(v => (
                  <option key={v.id} value={v.id}>{v.reg_number} — {v.brand} {v.model} ({v.type})</option>
                ))}
              </select>
            </div>
            <div><label className="form-label">Exchange Date</label><input type="date" className="form-input" value={exchangeDate} onChange={e => setExchangeDate(e.target.value)} /></div>
            <div><label className="form-label">Reason (optional)</label><input type="text" className="form-input" value={exchangeReason} onChange={e => setExchangeReason(e.target.value)} placeholder="e.g. Mechanical issue" /></div>
            <div><label className="form-label">Additional Charge (LKR)</label><input type="number" className="form-input" value={exchangeCharge} onChange={e => setExchangeCharge(e.target.value)} /></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setShowExchange(false); setError(null); }} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleExchange} disabled={isPending} className="btn-primary text-sm">
                <ArrowLeftRight className="w-3.5 h-3.5" /> Confirm Exchange
              </button>
            </div>
          </div>
        </div>
      )}

      <PasswordConfirmModal
        open={!!confirmAction}
        onOpenChange={() => { setConfirmAction(null); setPendingAction(null); }}
        title={confirmAction ?? "Confirm"}
        description="Enter your password to confirm this action."
        onConfirm={async () => { if (pendingAction) await pendingAction(); }}
      />

      <DocumentViewer open={docViewer.open} onOpenChange={(o) => setDocViewer({ ...docViewer, open: o })} url={docViewer.url} title={docViewer.title} />
    </div>
  );
}
