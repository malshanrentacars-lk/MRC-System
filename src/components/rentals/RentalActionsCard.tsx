"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowLeftRight, CalendarClock, CheckCircle2, Loader2, PauseCircle, Wrench, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/shared/StatusBadge";
import { daysBetween, formatCurrency, formatDate } from "@/lib/utils";
import { Rental, Vehicle } from "@/types";

type ActiveAction = "complete" | "extend" | "swap" | "pause" | "delete" | null;

interface RentalActionsCardProps {
  rental: Rental;
  availableVehicles: Vehicle[];
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string; message?: string } | undefined;
    return payload?.error ?? payload?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

const ACTION_STYLE = "group h-auto justify-start rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900";

export default function RentalActionsCard({ rental, availableVehicles }: RentalActionsCardProps) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [completeDate, setCompleteDate] = useState(rental.actual_return_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [completeKm, setCompleteKm] = useState(String(rental.return_km ?? rental.vehicle?.current_km ?? rental.pickup_km ?? 0));
  const [completeNotes, setCompleteNotes] = useState("");

  const [extendDate, setExtendDate] = useState(rental.end_date.slice(0, 10));

  const swapCandidates = useMemo(
    () => availableVehicles.filter((vehicle) => vehicle.id !== rental.vehicle_id),
    [availableVehicles, rental.vehicle_id]
  );
  const [swapVehicleId, setSwapVehicleId] = useState(swapCandidates[0]?.id ?? "");
  const [swapDate, setSwapDate] = useState(new Date().toISOString().slice(0, 10));
  const [swapReason, setSwapReason] = useState("");

  const currentRate = Number(rental.applied_rate ?? rental.daily_rate ?? 0);
  const currentAdditional = Number(rental.additional_charges ?? 0);
  const currentDiscount = Number(rental.discount ?? 0);
  const estimatedDays = Math.max(1, daysBetween(rental.start_date, extendDate));
  const estimatedSubtotal = Number((currentRate * estimatedDays).toFixed(2));
  const estimatedTotal = Number((estimatedSubtotal + currentAdditional - currentDiscount).toFixed(2));

  function resetAndClose(setOpen: (open: boolean) => void) {
    setOpen(false);
  }

  async function runAction(action: Exclude<ActiveAction, null>, runner: () => Promise<void>, successMessage: string) {
    setActiveAction(action);
    try {
      await runner();
      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Action failed"));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleComplete() {
    await runAction("complete", async () => {
      await axios.put(`/api/rentals/${rental.id}/complete`, {
        actual_return_date: completeDate,
        return_km: Number(completeKm) || rental.pickup_km || 0,
        return_notes: completeNotes || undefined,
      });
      setCompleteOpen(false);
    }, "Rental marked as completed.");
  }

  async function handleExtend() {
    await runAction("extend", async () => {
      await axios.put(`/api/rentals/${rental.id}?action=extend`, {
        expected_return_date: extendDate,
      });
      setExtendOpen(false);
    }, "Rental extended successfully.");
  }

  async function handleSwap() {
    if (!swapVehicleId) {
      toast.error("Choose a vehicle before swapping.");
      return;
    }

    await runAction("swap", async () => {
      await axios.put(`/api/rentals/${rental.id}/swap`, {
        new_vehicle_id: swapVehicleId,
        exchange_date: swapDate,
        reason: swapReason || undefined,
      });
      setSwapOpen(false);
    }, "Vehicle swapped successfully.");
  }

  async function handlePause() {
    await runAction("pause", async () => {
      await axios.put(`/api/rentals/${rental.id}/pause`);
    }, "Rental paused.");
  }

  async function handleDelete() {
    await runAction("delete", async () => {
      await axios.delete(`/api/rentals/${rental.id}`);
      setDeleteOpen(false);
    }, "Rental moved to cancelled records.");
  }

  const actionDisabled = activeAction !== null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white text-gray-900">
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Rental Actions</h3>
          <p className="text-xs text-gray-500">Complete, extend, exchange, pause, or delete the rental.</p>
        </div>

        <div className="grid gap-2">
          <button type="button" disabled={actionDisabled} onClick={() => setCompleteOpen(true)} className={ACTION_STYLE}>
            <span className="flex w-full items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold">Complete Rental</span>
                <span className="block text-xs text-gray-500">Mark complete and release vehicle</span>
              </span>
            </span>
          </button>

          <button type="button" disabled={actionDisabled} onClick={() => setExtendOpen(true)} className={ACTION_STYLE}>
            <span className="flex w-full items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold">Extend Rental</span>
                <span className="block text-xs text-gray-500">Change return date</span>
              </span>
            </span>
          </button>

          <button type="button" disabled={actionDisabled} onClick={() => { if (swapCandidates.length > 0) setSwapVehicleId(swapCandidates[0].id); setSwapOpen(true); }} className={ACTION_STYLE}>
            <span className="flex w-full items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <ArrowLeftRight className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold">Swap Vehicle</span>
                <span className="block text-xs text-gray-500">Assign another vehicle</span>
              </span>
            </span>
          </button>

          <button type="button" disabled={actionDisabled} onClick={handlePause} className={ACTION_STYLE}>
            <span className="flex w-full items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <PauseCircle className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold">Pause Rental</span>
                <span className="block text-xs text-gray-500">Temporarily freeze status</span>
              </span>
            </span>
          </button>

          <button type="button" disabled={actionDisabled} onClick={() => setDeleteOpen(true)}
            className="group h-auto justify-start rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-left text-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100">
            <span className="flex w-full items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Trash2 className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold text-red-800">Delete Rental</span>
                <span className="block text-xs text-red-600">Soft delete, keeps audit record</span>
              </span>
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
          <div><p className="text-gray-500">Rental</p><p className="font-medium text-gray-900">{rental.rental_number}</p></div>
          <div><p className="text-gray-500">Vehicle</p><p className="font-medium text-gray-900">{rental.vehicle?.reg_number ?? "—"}</p></div>
          <div><p className="text-gray-500">Ends</p><p className="font-medium text-gray-900">{formatDate(rental.end_date)}</p></div>
          <div><p className="text-gray-500">Total</p><p className="font-medium text-gray-900">{formatCurrency(Number(rental.total_amount ?? 0))}</p></div>
        </div>
      </div>

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>Complete Rental</DialogTitle>
            <DialogDescription>Save the actual return date and release the vehicle.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Return Date</Label>
                <Input type="date" value={completeDate} min={rental.start_date.slice(0, 10)} onChange={(e) => setCompleteDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Closing KM</Label>
                <Input type="number" min="0" value={completeKm} onChange={(e) => setCompleteKm(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} placeholder="Optional" />
            </div>
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Vehicle will move to available status.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetAndClose(setCompleteOpen)} disabled={actionDisabled}>Cancel</Button>
            <Button onClick={handleComplete} disabled={actionDisabled} className="bg-gray-900 text-white hover:bg-gray-800">
              {activeAction === "complete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="bg-white text-gray-900 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Extend Rental</DialogTitle>
            <DialogDescription>Push the return date forward and recalculate.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label>New Return Date</Label>
              <Input type="date" value={extendDate} min={rental.end_date.slice(0, 10)} onChange={(e) => setExtendDate(e.target.value)} />
            </div>
            <div className="grid gap-3 rounded-lg border bg-gray-50 p-4 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-gray-500">Days</p><p className="font-medium text-gray-900">{estimatedDays}</p></div>
              <div><p className="text-xs text-gray-500">Subtotal</p><p className="font-medium text-gray-900">{formatCurrency(estimatedSubtotal)}</p></div>
              <div><p className="text-xs text-gray-500">Est. Total</p><p className="font-medium text-gray-900">{formatCurrency(estimatedTotal)}</p></div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetAndClose(setExtendOpen)} disabled={actionDisabled}>Cancel</Button>
            <Button onClick={handleExtend} disabled={actionDisabled} className="bg-gray-900 text-white hover:bg-gray-800">
              {activeAction === "extend" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />} Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swap Dialog */}
      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="bg-white text-gray-900 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Swap Vehicle</DialogTitle>
            <DialogDescription>Move rental to another available vehicle.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="rounded-lg border bg-gray-50 p-3 text-sm">
              <p className="text-xs text-gray-500">Current</p>
              <p className="font-medium text-gray-900">{rental.vehicle?.brand} {rental.vehicle?.model} {rental.vehicle?.reg_number ? `• ${rental.vehicle.reg_number}` : ""}</p>
            </div>
            <div className="space-y-2">
              <Label>Replacement Vehicle</Label>
              <select value={swapVehicleId} onChange={(e) => setSwapVehicleId(e.target.value)} className="w-full h-10 rounded-lg border px-3 text-sm">
                <option value="">Select a vehicle</option>
                {swapCandidates.map((v) => (<option key={v.id} value={v.id}>{v.reg_number} - {v.brand} {v.model}</option>))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={swapDate} onChange={(e) => setSwapDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Reason</Label><Input value={swapReason} onChange={(e) => setSwapReason(e.target.value)} placeholder="Optional" /></div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetAndClose(setSwapOpen)} disabled={actionDisabled}>Cancel</Button>
            <Button onClick={handleSwap} disabled={actionDisabled || !swapCandidates.length} className="bg-gray-900 text-white hover:bg-gray-800">
              {activeAction === "swap" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />} Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white text-gray-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Rental</DialogTitle>
            <DialogDescription>Soft delete — moves to cancelled state.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
              <p>Vehicle will be released and rental kept for audit history.</p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => resetAndClose(setDeleteOpen)} disabled={actionDisabled}>Cancel</Button>
            <Button onClick={handleDelete} disabled={actionDisabled} className="bg-red-600 text-white hover:bg-red-700">
              {activeAction === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
