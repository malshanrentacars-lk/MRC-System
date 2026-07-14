"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, Key, Check } from "lucide-react";
import { generateTOTPSetup, verifySetupTOTP } from "@/app/actions/auth";

export default function Setup2FAPage() {
  const router = useRouter();
  const [step, setStep] = useState<"loading" | "show" | "verify" | "success">("loading");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const result = await generateTOTPSetup();
      if ("error" in result) {
        if (result.redirect) {
          router.push(result.redirect);
          return;
        }
        setError(result.error);
        return;
      }
      setQrDataUrl(result.qrDataUrl);
      setSecret(result.secret);
      setStep("show");
    }
    load();
  }, [router]);

  async function handleVerify() {
    if (code.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true);
    setError(null);
    const result = await verifySetupTOTP(code);
    if ("error" in result) { setError(result.error); setLoading(false); return; }
    setStep("success");
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Set Up Two-Factor Auth</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === "show" ? "Scan the QR code with your authenticator app" : "Verify the setup"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">{error}</div>
        )}

        {step === "loading" && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {(step === "show" || step === "verify") && (
          <div className="space-y-6">
            {qrDataUrl && step === "show" && (
              <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center">
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Or enter this key manually:</p>
                  <code className="text-sm font-mono bg-gray-200 px-3 py-1.5 rounded select-all break-all">{secret}</code>
                </div>
              </div>
            )}

            <div>
              <label className="form-label text-sm">Enter 6-digit code from your app</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="form-input text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Verify & Enable
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">2FA Enabled!</p>
            <p className="text-sm text-gray-500 mt-1">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
