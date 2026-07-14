"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, Key } from "lucide-react";
import { verifyLoginTOTP } from "@/app/actions/auth";

export default function Verify2FAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (code.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true);
    setError(null);
    const result = await verifyLoginTOTP(code);
    if ("error" in result) { setError(result.error); setLoading(false); return; }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the 6-digit code from your authenticator app</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">{error}</div>
        )}

        <div className="space-y-5">
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="form-input text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleVerify()}
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}
