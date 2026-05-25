"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rental, Vehicle } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { activateRental, returnRental, exchangeVehicle, cancelRental, uploadSignedAgreement, recordRentalPayment, removeSignedAgreement } from "@/app/actions/rentals";
import PasswordConfirmModal from "@/components/shared/PasswordConfirmModal";
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
  const [showAgreementViewer, setShowAgreementViewer] = useState(false);
  const [agreementPreviewUrl, setAgreementPreviewUrl] = useState<string | null>(null);
  const [agreementPreviewLoading, setAgreementPreviewLoading] = useState(false);
  const agreementViewerContainerRef = useRef<HTMLDivElement | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    setAgreementPreviewUrl(null);
    router.refresh();
  }

  async function openAgreementViewer() {
    if (!agreementUrl) return;

    setAgreementPreviewLoading(true);
    setShowAgreementViewer(true);

    try {
      const response = await fetch(agreementUrl);
      if (!response.ok) {
        throw new Error(`Failed to load PDF (${response.status})`);
      }

      const blob = await response.blob();
      const previewUrl = URL.createObjectURL(blob);
      setAgreementPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return previewUrl;
      });
    } catch {
      setAgreementPreviewUrl(null);
      setError("Could not open the PDF preview.");
    } finally {
      setAgreementPreviewLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (agreementPreviewUrl) URL.revokeObjectURL(agreementPreviewUrl);
    };
  }, [agreementPreviewUrl]);

  useEffect(() => {
    if (!showAgreementViewer || !agreementPreviewUrl) return;

    let cancelled = false;
    const container = agreementViewerContainerRef.current;
    if (!container) return;

    const renderPdf = async () => {
      setAgreementPreviewLoading(true);
      container.innerHTML = "";

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

        const pdf = await pdfjsLib.getDocument({ url: agreementPreviewUrl }).promise;
        if (cancelled) return;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;

          const viewport = page.getViewport({ scale: 1.5 });
          const pageWrap = document.createElement("div");
          pageWrap.className = "bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 mb-4";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";

          await page.render({ canvasContext: context, canvas, viewport }).promise;
          pageWrap.appendChild(canvas);
          container.appendChild(pageWrap);
        }
      } catch {
        if (!cancelled) {
          container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-sm text-gray-500">Could not render PDF preview.</div>';
        }
      } finally {
        if (!cancelled) setAgreementPreviewLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [agreementPreviewUrl, showAgreementViewer]);

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
              <TabsTrigger value="inspection"><ClipboardList className="w-3.5 h-3.5 mr-1.5 inline" />Inspection</TabsTrigger>
              <TabsTrigger value="guarantor"><Shield className="w-3.5 h-3.5 mr-1.5 inline" />Guarantor</TabsTrigger>
              <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 mr-1.5 inline" />Documents</TabsTrigger>
              <TabsTrigger value="activity"><Activity className="w-3.5 h-3.5 mr-1.5 inline" />Activity Log</TabsTrigger>
            </TabsList>
            <div className="mb-2">{actionButtons}</div>
          </div>

          {/* ── DETAILS TAB ── */}
          <TabsContent value="details" className="mt-0">
            <div className="p-5 bg-white">
              {/* Prominent payment settlement banner */}
              {netBalance === 0 ? (
                <div className="mb-4 bg-green-50 border-l-4 border-green-500 rounded-md p-3 text-green-900">
                  <p className="font-semibold">Payment Settled</p>
                  <p className="text-sm text-green-700">Full payment received — no outstanding balance.</p>
                </div>
              ) : netBalance > 0 ? (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-md p-3 text-red-900">
                  <p className="font-semibold">Payment Due</p>
                  <p className="text-sm text-red-700">Outstanding amount: {formatCurrency(balanceDue)}</p>
                </div>
              ) : (
                <div className="mb-4 bg-purple-50 border-l-4 border-purple-500 rounded-md p-3 text-purple-900">
                  <p className="font-semibold">Refund Pending</p>
                  <p className="text-sm text-purple-700">Refund to customer: {formatCurrency(refundDue)}</p>
                </div>
              )}
              <div className="details-container grid grid-cols-12 gap-6">
                {/* Left column (Main) */}
                <div className="col-span-12 md:col-span-8 space-y-6">
                  <div className="bg-white rounded-lg p-5 text-gray-900 border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Rental Information</p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Rental #", value: rental.rental_number },
                        { label: "Status", value: <StatusBadge status={rental.status} className="bg-white/5" /> },
                        { label: "Payment", value: <StatusBadge status={rental.payment_status} /> },
                        { label: "Rate Type", value: (rental as any).rate_type ?? "Daily" },
                        { label: "Pickup Date", value: formatDate(rental.start_date) },
                        { label: "Expected Return", value: formatDate(rental.end_date) },
                        { label: "Actual Return", value: rental.actual_return_date ? formatDate(rental.actual_return_date) : "—" },
                        { label: "Total Days", value: `${rental.total_days} days` },
                        { label: "Pickup KM", value: `${rental.pickup_km?.toLocaleString() ?? 0} km` },
                        { label: "Return KM", value: rental.return_km ? `${rental.return_km.toLocaleString()} km` : "—" },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-[11px] text-gray-500 mb-0.5">{f.label}</p>
                          <div className="text-sm font-semibold text-gray-900">{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-white rounded-lg p-5 text-gray-900 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Pricing & Payment</p>
                      <StatusBadge
                        status={
                          netBalance < 0 ? "refund_pending" : netBalance > 0 ? "balance_due" : "paid"
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-[11px] text-gray-500">Base</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(appliedRate)} x {rentalDuration} day(s)</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(baseAmount)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-[11px] text-gray-500">Collections</p>
                        <p className="text-sm font-semibold text-gray-900">Advance {formatCurrency(advancePaid)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Deposit {formatCurrency(depositApplied)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-[11px] text-gray-500">Final Amount</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(finalAmount)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">After charges & discounts</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Settlement Ledger</p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Final Amount</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(finalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Advance Paid</span>
                        <span className="font-medium text-emerald-700">- {formatCurrency(advancePaid)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Security Deposit Applied</span>
                        <span className="font-medium text-emerald-700">- {formatCurrency(depositApplied)}</span>
                      </div>
                      {(extraCharges > 0 || discount > 0) && (
                        <div className="pt-1 border-t border-gray-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Extra Charges</span>
                            <span className="text-gray-700">+ {formatCurrency(extraCharges)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Discount</span>
                            <span className="text-gray-700">- {formatCurrency(discount)}</span>
                          </div>
                        </div>
                      )}
                      <div className="pt-2 mt-2 border-t border-gray-300 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Net Balance</span>
                        <span className={`font-bold ${netBalance < 0 ? "text-purple-700" : netBalance > 0 ? "text-red-600" : "text-green-700"}`}>
                          {netBalance < 0 ? `Refund ${formatCurrency(refundDue)}` : netBalance > 0 ? `Due ${formatCurrency(balanceDue)}` : "Settled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Vehicle summary */}
                    <div className="bg-white rounded-xl p-4 text-gray-900 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Car className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</p>
                      </div>
                      <p className="font-semibold text-gray-900">{rental.vehicle?.brand} {rental.vehicle?.model}</p>
                      <p className="text-sm text-blue-600 font-medium">{rental.vehicle?.reg_number}</p>
                      <p className="text-xs text-gray-500 mt-1">{rental.vehicle?.type} · {rental.vehicle?.color}</p>
                      <StatusBadge status={rental.vehicle?.status ?? "available"} className="mt-2" />
                    </div>

                    {/* Customer summary */}
                    <div className="bg-white rounded-xl p-4 text-gray-900 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
                      </div>
                      <p className="font-semibold text-gray-900">{rental.customer?.name}</p>
                      <p className="text-sm text-gray-700">{rental.customer?.phone}</p>
                      <p className="text-xs text-gray-500 mt-1">NIC: {rental.customer?.nic ?? "—"}</p>
                      <p className="text-xs text-gray-500">License: {rental.customer?.license_number ?? "—"}</p>
                    </div>
                  </div>

                  {/* Exchange History */}
                  {(rental.exchanges ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Vehicle Exchanges</p>
                      <div className="space-y-2">
                        {[...(rental.exchanges ?? [])]
                          .sort((a, b) => new Date(b.exchange_date).getTime() - new Date(a.exchange_date).getTime())
                          .map((ex, idx) => (
                            <div key={ex.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 text-gray-900 border border-gray-200">
                              {idx === 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Current</span>}
                              <span className="text-sm text-gray-500">{ex.old_vehicle?.reg_number}</span>
                              <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{ex.new_vehicle?.reg_number}</span>
                              <span className="text-xs text-gray-500 ml-auto">{formatDate(ex.exchange_date)}</span>
                              {ex.reason && <span className="text-xs text-gray-500">· {ex.reason}</span>}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Agreement Summary */}
                  <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-white">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Agreement</p>
                    <p className="text-sm text-gray-700">
                      Rental <strong>{rental.rental_number}</strong> for <strong>{rental.customer?.name}</strong> —
                      vehicle <strong>{rental.vehicle?.reg_number}</strong> from <strong>{formatDate(rental.start_date)}</strong> to <strong>{formatDate(rental.end_date)}</strong>.
                      Total payable: <strong>{formatCurrency(rental.total_amount ?? 0)}</strong>.
                      Deposit held: <strong>{formatCurrency(rental.deposit)}</strong>.
                    </p>
                    <a href={`/agreements/${rental.id}`} target="_blank" rel="noopener"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-purple-600 hover:underline font-medium">
                      <FileText className="w-3.5 h-3.5" /> View Full Agreement
                    </a>
                  </div>
                </div>

                {/* Right column (Sidebar) */}
                <div className="col-span-12 md:col-span-4 space-y-4">
                  <RentalActionsCard rental={rental} availableVehicles={availableVehicles} />

                  <div className="bg-white rounded-lg p-4 text-gray-900 border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium mb-3">Record Payment</p>
                    <div className="space-y-2">
                      <input
                        placeholder="Amount (LKR)"
                        className="form-input bg-white text-gray-900 border border-gray-300"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      <select
                        className="form-select bg-white text-gray-900 border border-gray-300"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option>Cash</option>
                        <option>Card</option>
                        <option>Bank Transfer</option>
                      </select>
                      <textarea
                        className="form-input bg-white text-gray-900 resize-none border border-gray-300"
                        rows={2}
                        placeholder="Payment notes (optional)"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                      <button onClick={handleRecordPayment} className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700">
                        Record Payment
                      </button>
                    </div>
                  </div>

                  {rental.payment_status === "paid" && (
                    <div className="bg-green-50 border-l-4 border-green-500 rounded-md p-3 text-green-900">
                      <p className="font-medium">Payment Settled</p>
                      <p className="text-sm text-green-700">Full payment received on {formatDate((rental as any).last_payment_date ?? rental.actual_return_date ?? rental.start_date)}</p>
                    </div>
                  )}

                  <div className="bg-white rounded-lg p-4 text-gray-900 border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 font-medium mb-2">Info</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li className="flex items-start justify-between gap-3">
                        <span>Rental ID:</span>
                        <span className="text-gray-900 text-right break-all">{rental.id}</span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span>Status:</span>
                        <StatusBadge status={rental.status} />
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span>Payment:</span>
                        <StatusBadge status={rental.payment_status} />
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span>Created At:</span>
                        <span className="text-gray-900 text-right">{formatDate(rental.created_at ?? rental.start_date)}</span>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span>Last Updated:</span>
                        <span className="text-gray-900 text-right">{formatDate(rental.updated_at ?? rental.start_date)}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-4 text-gray-900 border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500 font-medium">Signed Agreement</p>
                      <label htmlFor={agreementFileInputId} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 cursor-pointer ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
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
                          if (!isPdf) {
                            setError("Only PDF files are allowed.");
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setError("File size must be 5MB or less.");
                            return;
                          }
                          await handleAgreementUpload(file);
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">Only PDF files are allowed. Maximum file size: 5MB.</p>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    {agreementUrl ? (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm">Signed Agreement PDF</p>
                            <p className="text-xs text-gray-500 truncate">{agreementPath || "Uploaded file"}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              openAgreementViewer();
                            }}
                            className="w-full inline-flex items-center justify-center rounded py-2 bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
                          >
                            View PDF
                          </a>
                          <button
                            type="button"
                            onClick={() => handleAgreementDelete()}
                            className="w-full inline-flex items-center justify-center rounded py-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium"
                          >
                            Delete PDF
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                        No signed agreement uploaded yet.
                      </div>
                    )}
                  </div>
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
            <div className="p-5">
              {rental.guarantor ? (
                <div className="max-w-lg space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Guarantor Details</p>
                  <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{rental.guarantor.name}</p>
                          <p className="text-xs text-gray-500">{rental.guarantor.relationship ?? "Guarantor"}</p>
                        </div>
                      </div>
                      <a href="/guarantors" className="text-xs text-blue-600 hover:underline font-medium">View All Guarantors →</a>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "NIC", value: rental.guarantor.nic ?? "—" },
                        { label: "Phone", value: rental.guarantor.phone ?? "—" },
                        { label: "Alt. Phone", value: rental.guarantor.phone2 ?? "—" },
                        { label: "Address", value: rental.guarantor.address ?? "—" },
                        { label: "Relationship", value: rental.guarantor.relationship ?? "—" },
                        { label: "Since", value: formatDate(rental.guarantor.created_at) },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                          <p className="text-sm font-medium text-gray-900">{f.value}</p>
                        </div>
                      ))}
                    </div>
                    {rental.guarantor.notes && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Notes</p>
                        <p className="text-sm text-gray-600">{rental.guarantor.notes}</p>
                      </div>
                    )}
                  </div>
                  {/* Customer link */}
                  {rental.customer && (
                    <div className="bg-blue-50/40 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Guaranteed for Customer</p>
                        <p className="font-semibold text-gray-900">{rental.customer.name}</p>
                        <p className="text-xs text-gray-500">{rental.customer.phone}</p>
                      </div>
                      <a href={`/customers/${rental.customer_id}`} className="btn-secondary text-xs">View Customer →</a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-gray-300">
                  <Shield className="w-10 h-10 mb-3" />
                  <p className="text-sm text-gray-400">No guarantor assigned to this rental.</p>
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

      {showAgreementViewer && agreementUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-900">Signed Agreement PDF</p>
                <p className="text-xs text-gray-500 truncate max-w-[60vw]">{agreementPath || agreementUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={agreementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100"
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setShowAgreementViewer(false)}
                  className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 overflow-auto p-4">
              {agreementPreviewLoading && !agreementPreviewUrl ? (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                  Loading PDF preview...
                </div>
              ) : (
                <div ref={agreementViewerContainerRef} className="mx-auto max-w-4xl" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
