"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, ArrowLeftRight, CalendarClock, CheckCircle2, Loader2, PauseCircle, ShieldAlert, Trash2, Wrench } from "lucide-react";
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
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500" />
      <div className="absolute -right-10 top-0 h-24 w-24 rounded-full bg-sky-100/80 blur-3xl" />
      <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-indigo-100/70 blur-3xl" />
      <div className="relative space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              <ShieldAlert className="h-3.5 w-3.5" />
              Rental Actions
            </div>
            <h3 className="mt-2.5 text-base font-semibold text-slate-900">Rental actions</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Complete, extend, exchange, pause, or retire the rental from one place.</p>
          </div>
          <div className="hidden sm:block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Status</p>
            <div className="mt-1.5 flex justify-end">
              <StatusBadge status={rental.status} />
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
          <Button
            type="button"
            disabled={actionDisabled}
            onClick={() => setCompleteOpen(true)}
            className="group h-auto justify-start rounded-2xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-left text-emerald-800 shadow-[0_12px_30px_-22px_rgba(16,185,129,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-100 hover:text-emerald-900"
          >
            <span className="flex w-full items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform duration-200 group-hover:scale-105">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Complete Rental</span>
                <span className="block text-[11px] text-emerald-700/75">Mark complete and release the vehicle</span>
              </span>
            </span>
          </Button>

          <Button
            type="button"
            disabled={actionDisabled}
            onClick={() => setExtendOpen(true)}
            className="group h-auto justify-start rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-left text-amber-800 shadow-[0_12px_30px_-22px_rgba(245,158,11,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-100 hover:text-amber-900"
          >
            <span className="flex w-full items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-transform duration-200 group-hover:scale-105">
                <CalendarClock className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Extend Rental</span>
                <span className="block text-[11px] text-amber-700/75">Change return date and recalculate total</span>
              </span>
            </span>
          </Button>

          <Button
            type="button"
            disabled={actionDisabled}
            onClick={() => {
              if (swapCandidates.length > 0) setSwapVehicleId(swapCandidates[0].id);
              setSwapOpen(true);
            }}
            className="group h-auto justify-start rounded-2xl border border-sky-100 bg-sky-50 px-3.5 py-3 text-left text-sky-800 shadow-[0_12px_30px_-22px_rgba(14,165,233,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-100 hover:text-sky-900"
          >
            <span className="flex w-full items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 transition-transform duration-200 group-hover:scale-105">
                <ArrowLeftRight className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Swap Vehicle</span>
                <span className="block text-[11px] text-sky-700/75">Assign another vehicle to this rental</span>
              </span>
            </span>
          </Button>

          <Button
            type="button"
            disabled={actionDisabled}
            onClick={handlePause}
            className="group h-auto justify-start rounded-2xl border border-violet-100 bg-violet-50 px-3.5 py-3 text-left text-violet-800 shadow-[0_12px_30px_-22px_rgba(139,92,246,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-100 hover:text-violet-900"
          >
            <span className="flex w-full items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 transition-transform duration-200 group-hover:scale-105">
                {activeAction === "pause" ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <PauseCircle className="h-4.5 w-4.5" />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Pause Rental</span>
                <span className="block text-[11px] text-violet-700/75">Temporarily freeze the rental status</span>
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={actionDisabled}
            onClick={() => setDeleteOpen(true)}
            className="group h-auto justify-start rounded-2xl border border-rose-100 bg-rose-50 px-3.5 py-3 text-left text-rose-800 shadow-[0_12px_30px_-22px_rgba(244,63,94,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:text-rose-900"
          >
            <span className="flex w-full items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 transition-transform duration-200 group-hover:scale-105">
                <Trash2 className="h-4.5 w-4.5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Delete Rental</span>
                <span className="block text-[11px] text-rose-700/75">Soft delete and keep the record traceable</span>
              </span>
            </span>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 sm:grid-cols-3">
          <div>
            <p className="uppercase tracking-[0.18em] text-slate-500">Rental</p>
            <p className="mt-1 font-medium text-slate-900">{rental.rental_number}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.18em] text-slate-500">Vehicle</p>
            <p className="mt-1 font-medium text-slate-900">{rental.vehicle?.reg_number ?? "—"}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="uppercase tracking-[0.18em] text-slate-500">Ends</p>
            <p className="mt-1 font-medium text-slate-900">{formatDate(rental.end_date)}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.18em] text-slate-500">Total</p>
            <p className="mt-1 font-medium text-slate-900">{formatCurrency(Number(rental.total_amount ?? 0))}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.18em] text-slate-500">Rate</p>
            <p className="mt-1 font-medium text-slate-900">{formatCurrency(currentRate)}</p>
          </div>
        </div>
      </div>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Complete Rental</DialogTitle>
            <DialogDescription>Save the actual return date and free up the current vehicle.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="complete-date" className="text-slate-700">Actual Return Date</Label>
                <Input
                  id="complete-date"
                  type="date"
                  value={completeDate}
                  min={rental.start_date.slice(0, 10)}
                  onChange={(e) => setCompleteDate(e.target.value)}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complete-km" className="text-slate-700">Closing KM</Label>
                <Input
                  id="complete-km"
                  type="number"
                  min="0"
                  step="1"
                  value={completeKm}
                  onChange={(e) => setCompleteKm(e.target.value)}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-notes" className="text-slate-700">Return Notes</Label>
              <Input
                id="complete-notes"
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Optional handover notes"
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              The vehicle will move back to available and the actual return date will be saved.
            </div>
          </DialogBody>
          <DialogFooter className="border-slate-200 bg-slate-50">
            <Button variant="outline" onClick={() => resetAndClose(setCompleteOpen)} disabled={activeAction === "complete"} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={activeAction === "complete"} className="bg-emerald-500 text-white hover:bg-emerald-600">
              {activeAction === "complete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Complete Rental
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Extend Rental</DialogTitle>
            <DialogDescription>Push the expected return date forward and recalculate the rental total.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="extend-date" className="text-slate-700">New Expected Return Date</Label>
              <Input
                id="extend-date"
                type="date"
                value={extendDate}
                min={rental.end_date.slice(0, 10)}
                onChange={(e) => setExtendDate(e.target.value)}
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Days</p>
                <p className="mt-1 font-medium text-slate-900">{estimatedDays}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Subtotal</p>
                <p className="mt-1 font-medium text-slate-900">{formatCurrency(estimatedSubtotal)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Estimated Total</p>
                <p className="mt-1 font-medium text-slate-900">{formatCurrency(estimatedTotal)}</p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="border-slate-200 bg-slate-50">
            <Button variant="outline" onClick={() => resetAndClose(setExtendOpen)} disabled={activeAction === "extend"} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
            <Button onClick={handleExtend} disabled={activeAction === "extend"} className="bg-amber-500 text-white hover:bg-amber-600">
              {activeAction === "extend" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
              Update Rental
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Swap Vehicle</DialogTitle>
            <DialogDescription>Move this rental to another available vehicle and close out the current unit.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Vehicle</p>
              <p className="mt-1 font-medium text-slate-900">{rental.vehicle?.brand} {rental.vehicle?.model} {rental.vehicle?.reg_number ? `• ${rental.vehicle.reg_number}` : ""}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="swap-vehicle" className="text-slate-700">Replacement Vehicle</Label>
              <select
                id="swap-vehicle"
                value={swapVehicleId}
                onChange={(e) => setSwapVehicleId(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-0 focus:border-sky-400"
              >
                <option value="">Select a vehicle</option>
                {swapCandidates.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.reg_number} - {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="swap-date" className="text-slate-700">Exchange Date</Label>
                <Input
                  id="swap-date"
                  type="date"
                  value={swapDate}
                  onChange={(e) => setSwapDate(e.target.value)}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="swap-reason" className="text-slate-700">Reason</Label>
                <Input
                  id="swap-reason"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="Optional note"
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="border-slate-200 bg-slate-50">
            <Button variant="outline" onClick={() => resetAndClose(setSwapOpen)} disabled={activeAction === "swap"} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
            <Button onClick={handleSwap} disabled={activeAction === "swap" || !swapCandidates.length} className="bg-sky-500 text-white hover:bg-sky-600">
              {activeAction === "swap" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}
              Swap Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-rose-200 bg-white text-slate-900 shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Rental</DialogTitle>
            <DialogDescription>This will soft delete the rental by moving it into the cancelled state.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                The vehicle will be released back to available inventory and the rental will remain in the system for audit history.
              </p>
            </div>
          </DialogBody>
          <DialogFooter className="border-slate-200 bg-slate-50">
            <Button variant="outline" onClick={() => resetAndClose(setDeleteOpen)} disabled={activeAction === "delete"} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={activeAction === "delete"} className="bg-rose-500 text-white hover:bg-rose-600">
              {activeAction === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Rental
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}