"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  PauseCircle,
  ShieldCheck,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";

type RentalAction = "complete" | "extend" | "swap" | "pause" | "delete" | null;

interface RentalActionsProps {
  rentalId: string;
  currentStatus: string;
  vehicleId: string;
  dailyRate?: number;
}

const statusStyles: Record<string, { pill: string; label: string; description: string }> = {
  active: {
    pill: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    label: "Active",
    description: "The rental is currently in motion.",
  },
  completed: {
    pill: "border-slate-500/30 bg-slate-500/15 text-slate-200",
    label: "Completed",
    description: "The vehicle has been returned and closed out.",
  },
  paused: {
    pill: "border-violet-500/30 bg-violet-500/15 text-violet-200",
    label: "Paused",
    description: "The rental is temporarily frozen.",
  },
  extended: {
    pill: "border-amber-500/30 bg-amber-500/15 text-amber-200",
    label: "Extended",
    description: "The return date was pushed forward.",
  },
  swapped: {
    pill: "border-sky-500/30 bg-sky-500/15 text-sky-200",
    label: "Swapped",
    description: "The rental moved to another vehicle.",
  },
  default: {
    pill: "border-slate-500/30 bg-slate-500/15 text-slate-200",
    label: "Unknown",
    description: "Status provided by the record.",
  },
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: string; message?: string } | undefined;
    return payload?.error ?? payload?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

function normalizeStatus(status: string) {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export default function RentalActions({ rentalId, currentStatus, vehicleId, dailyRate = 50 }: RentalActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<RentalAction>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("1");
  const [swapVehicleId, setSwapVehicleId] = useState("");

  const safeDailyRate = Number.isFinite(dailyRate) && dailyRate > 0 ? dailyRate : 50;
  const normalizedStatus = normalizeStatus(currentStatus);
  const statusMeta = statusStyles[normalizedStatus] ?? statusStyles.default;
  const isBusy = loadingAction !== null;

  const parsedExtendDays = Math.max(1, Number.parseInt(extendDays, 10) || 0);
  const estimatedExtensionCost = useMemo(() => parsedExtendDays * safeDailyRate, [parsedExtendDays, safeDailyRate]);

  async function runAction(action: Exclude<RentalAction, null>, runner: () => Promise<void>, successMessage: string) {
    setLoadingAction(action);
    try {
      await runner();
      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "The requested rental action failed."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleComplete() {
    await runAction("complete", async () => {
      await axios.put(`/api/rentals/${rentalId}?action=complete`, {
        actual_return_date: new Date().toISOString(),
      });
      setDeleteOpen(false);
      setExtendOpen(false);
      setSwapOpen(false);
    }, "Rental marked as completed.");
  }

  async function handleExtend() {
    await runAction("extend", async () => {
      await axios.put(`/api/rentals/${rentalId}?action=extend`, {
        days: parsedExtendDays,
      });
      setExtendOpen(false);
    }, "Rental extended successfully.");
  }

  async function handleSwap() {
    if (!swapVehicleId.trim()) {
      toast.error("Enter the replacement vehicle ID before continuing.");
      return;
    }

    await runAction("swap", async () => {
      await axios.put(`/api/rentals/${rentalId}?action=swap`, {
        new_vehicle_id: swapVehicleId.trim(),
      });
      setSwapOpen(false);
    }, "Vehicle swapped successfully.");
  }

  async function handlePause() {
    await runAction("pause", async () => {
      await axios.put(`/api/rentals/${rentalId}?action=pause`);
    }, normalizedStatus === "paused" ? "Rental resumed." : "Rental paused.");
  }

  async function handleDelete() {
    await runAction("delete", async () => {
      await axios.delete(`/api/rentals/${rentalId}`);
      setDeleteOpen(false);
    }, "Rental moved to cancelled records.");
  }

  const pauseLabel = normalizedStatus === "paused" ? "Resume Rental" : "Pause Rental";

  return (
    <section
      className="relative w-full max-w-[350px] overflow-hidden rounded-xl border border-[--brand-dark-border] bg-[#261414] p-5 text-white shadow-[0_30px_90px_-40px_rgba(15,8,8,0.85)] backdrop-blur-xl"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />

      <div className="relative space-y-5">
        <div className="space-y-3">
          <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.24em] uppercase", statusMeta.pill)}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {statusMeta.label}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Rental Actions</h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">{statusMeta.description}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <Button
            type="button"
            disabled={isBusy}
            onClick={handleComplete}
            className="h-auto rounded-xl border border-[--brand-dark-border] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-left text-white transition-all duration-200 hover:scale-[1.01] hover:border-[--brand-primary] hover:bg-[rgba(239,68,68,0.12)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                {loadingAction === "complete" ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold text-white">Complete Rental</span>
                <span className="block text-xs text-emerald-200/80">Close the rental and release the vehicle</span>
              </span>
            </span>
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              disabled={isBusy}
              onClick={() => setExtendOpen(true)}
              className="w-full py-3.5 px-4 bg-[rgba(255,165,0,0.06)] hover:bg-[rgba(255,165,0,0.1)] border border-[rgba(255,165,0,0.08)] text-orange-300 font-medium rounded-xl flex items-start gap-4 transition-all duration-300 transform active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400 shrink-0">
                <WandSparkles className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white text-base">Extend Rental</span>
                <span className="text-xs text-orange-400/80 mt-0.5">Change return date and recalculate total amount</span>
              </div>
            </Button>

            <Button
              type="button"
              disabled={isBusy}
              onClick={() => setSwapOpen(true)}
              className="h-auto rounded-xl border border-[--brand-dark-border] bg-[rgba(56,189,248,0.04)] px-4 py-3 text-left text-white transition-all duration-200 hover:scale-[1.01] hover:border-sky-400/30 hover:bg-[rgba(56,189,248,0.06)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                  <ArrowLeftRight className="h-4.5 w-4.5" />
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-white">Swap</span>
                  <span className="block text-[11px] text-sky-200/75">Change vehicle ID</span>
                </span>
              </span>
            </Button>
          </div>

          <Button
            type="button"
            disabled={isBusy}
            onClick={handlePause}
            className="h-auto rounded-xl border border-[--brand-dark-border] bg-[rgba(139,92,246,0.04)] px-4 py-3 text-left text-white transition-all duration-200 hover:scale-[1.01] hover:border-violet-400/30 hover:bg-[rgba(139,92,246,0.06)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                {loadingAction === "pause" ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <PauseCircle className="h-4.5 w-4.5" />}
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold text-white">{pauseLabel}</span>
                <span className="block text-xs text-violet-200/80">Toggle between active and paused states</span>
              </span>
            </span>
          </Button>
        </div>

        <div className="rounded-xl border border-[--brand-dark-border] bg-[rgba(255,255,255,0.02)] p-4 text-sm text-white/80">
          <div className="flex items-center justify-between gap-3">
            <span>Rental ID</span>
            <span className="font-medium text-white">{rentalId}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>Vehicle ID</span>
            <span className="font-medium text-white">{vehicleId}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>Daily Rate</span>
            <span className="font-medium text-white">{formatCurrency(safeDailyRate)}</span>
          </div>
        </div>

        <div className="space-y-3 border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-200">
            <Trash2 className="h-4 w-4" />
            Delete Rental
          </div>
          <p className="text-sm leading-6 text-slate-400">Soft delete the rental after confirming the destructive action.</p>
          <Button
            type="button"
            disabled={isBusy}
            onClick={() => setDeleteOpen(true)}
            className="h-auto w-full rounded-xl border border-[--brand-dark-border] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-left text-white transition-all duration-200 hover:scale-[1.01] hover:border-[--brand-primary] hover:bg-[rgba(239,68,68,0.12)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
                {loadingAction === "delete" ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <AlertTriangle className="h-4.5 w-4.5" />}
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold text-white">Delete Rental</span>
                <span className="block text-xs text-rose-200/80">Move the record to cancelled</span>
              </span>
            </span>
          </Button>
        </div>
      </div>

      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="border-[#1E293B] bg-[#08111C] text-slate-100 shadow-2xl sm:max-w-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
          <DialogHeader>
            <DialogTitle>Extend Rental</DialogTitle>
            <DialogDescription className="text-slate-400">Enter the number of days to extend and review the cost estimate.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="extend-days" className="text-slate-300">Extension Days</Label>
              <Input
                id="extend-days"
                type="number"
                min="1"
                step="1"
                value={extendDays}
                onChange={(event) => setExtendDays(event.target.value)}
                className="border-[#203040] bg-[#0D1B2A] text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">
              <div className="flex items-center justify-between gap-3">
                <span>Daily Rate</span>
                <span className="font-semibold">{formatCurrency(safeDailyRate)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>Estimated Cost</span>
                <span className="font-semibold">{formatCurrency(estimatedExtensionCost)}</span>
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="border-[#1E293B] bg-[#0B1623]">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setExtendOpen(false)}
              className="border-[#203040] bg-[#0D1B2A] text-slate-200 transition-all duration-200 hover:scale-[1.01] hover:bg-[#122235] active:scale-[0.98]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBusy}
              onClick={handleExtend}
              className="bg-orange-500 text-white transition-all duration-200 hover:scale-[1.01] hover:bg-orange-400 active:scale-[0.98] disabled:opacity-60"
            >
              {loadingAction === "extend" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
              Extend Rental
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="border-[#1E293B] bg-[#08111C] text-slate-100 shadow-2xl sm:max-w-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
          <DialogHeader>
            <DialogTitle>Swap Vehicle</DialogTitle>
            <DialogDescription className="text-slate-400">Enter the replacement vehicle ID to move the rental to a new unit.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
              <div className="flex items-center justify-between gap-3">
                <span>Current Vehicle ID</span>
                <span className="font-semibold">{vehicleId}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="swap-vehicle-id" className="text-slate-300">Replacement Vehicle ID</Label>
              <Input
                id="swap-vehicle-id"
                value={swapVehicleId}
                onChange={(event) => setSwapVehicleId(event.target.value)}
                placeholder="Paste a different vehicle ID"
                className="border-[#203040] bg-[#0D1B2A] text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </DialogBody>
          <DialogFooter className="border-[#1E293B] bg-[#0B1623]">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setSwapOpen(false)}
              className="border-[#203040] bg-[#0D1B2A] text-slate-200 transition-all duration-200 hover:scale-[1.01] hover:bg-[#122235] active:scale-[0.98]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBusy || !swapVehicleId.trim()}
              onClick={handleSwap}
              className="bg-sky-500 text-slate-950 transition-all duration-200 hover:scale-[1.01] hover:bg-sky-400 active:scale-[0.98] disabled:opacity-60"
            >
              {loadingAction === "swap" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}
              Swap Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-[#401B25] bg-[#08111C] text-slate-100 shadow-2xl sm:max-w-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
          <DialogHeader>
            <DialogTitle>Delete Rental</DialogTitle>
            <DialogDescription className="text-slate-400">This performs a soft delete and returns the vehicle to available inventory.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                Confirming this action will cancel the rental record and preserve the audit trail in the database.
              </p>
            </div>
          </DialogBody>
          <DialogFooter className="border-[#1E293B] bg-[#0B1623]">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => setDeleteOpen(false)}
              className="border-[#203040] bg-[#0D1B2A] text-slate-200 transition-all duration-200 hover:scale-[1.01] hover:bg-[#122235] active:scale-[0.98]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isBusy}
              onClick={handleDelete}
              className="bg-rose-500 text-white transition-all duration-200 hover:scale-[1.01] hover:bg-rose-400 active:scale-[0.98] disabled:opacity-60"
            >
              {loadingAction === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Rental
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}