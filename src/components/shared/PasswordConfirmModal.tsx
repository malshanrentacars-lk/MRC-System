"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { verifyPasswordAction } from "@/app/actions/auth";
import { Lock, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "primary" | "danger";
}

export default function PasswordConfirmModal({
  open,
  onOpenChange,
  title = "Confirm Action",
  description = "Please enter your password to confirm this action.",
  onConfirm,
  variant = "primary",
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDanger = variant === "danger";

  async function handleConfirm() {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    startTransition(async () => {
      const valid = await verifyPasswordAction(password);
      if (!valid) {
        setError("Incorrect password. Please try again.");
        return;
      }
      setPassword("");
      setError(null);
      onOpenChange(false);
      await onConfirm();
    });
  }

  function handleClose() {
    setPassword("");
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden !rounded-2xl">
        {/* Header */}
        <div className={cn(
          "px-6 py-5 text-white",
          isDanger
            ? "bg-gradient-to-br from-red-600 to-red-700"
            : "bg-gradient-to-br from-blue-600 to-blue-700",
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
              isDanger ? "bg-white/20 backdrop-blur-sm" : "bg-white/20 backdrop-blur-sm",
            )}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold p-0 m-0 text-inherit">{title}</DialogTitle>
              <p className={cn("text-sm mt-0.5", isDanger ? "text-red-100" : "text-blue-100")}>{description}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 bg-card">
          <div className="flex items-start gap-2.5 mb-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              This action cannot be easily undone. Confirm only if you are sure.
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
              Enter Your Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="confirm-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                className={cn(
                  "w-full h-10 pl-10 pr-4 rounded-lg border bg-background text-sm transition-colors",
                  isDanger ? "focus:ring-red-500 focus:border-red-500" : "focus:ring-blue-500 focus:border-blue-500",
                  "focus:outline-none focus:ring-2",
                  error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-input",
                )}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
          <button onClick={handleClose} disabled={isPending} className={cn(
            "h-9 px-4 rounded-lg text-sm font-medium border transition-colors",
            "bg-background hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300",
            isPending && "opacity-50 cursor-not-allowed",
          )}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={isPending || !password.trim()} className={cn(
            "h-9 px-5 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2 shadow-sm",
            isDanger ? "bg-red-600 hover:bg-red-700 active:bg-red-800" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
            (isPending || !password.trim()) && "opacity-50 cursor-not-allowed",
          )}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
