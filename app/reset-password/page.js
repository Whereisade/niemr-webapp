"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const uid = sp.get("uid") || "";
  const token = sp.get("token") || "";

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const hasParams = useMemo(() => Boolean(uid && token), [uid, token]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      if (!hasParams) throw new Error("Missing reset link parameters.");
      if (!p1 || p1.length < 8) throw new Error("Password must be at least 8 characters.");
      if (p1 !== p2) throw new Error("Passwords do not match.");

      const r = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: p1 }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || "Could not reset password");

      setDone(true);
      // small UX convenience
      setTimeout(() => router.push("/login"), 1200);
    } catch (e2) {
      setErr(e2?.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-md">
        <div className="card-body">
          <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold">
            NIEMR
          </div>
          <h2 className="h2 mt-1">Reset Password</h2>
          <p className="muted text-sm">
            Choose a new password for your account.
          </p>

          {!hasParams ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This reset link is missing parameters. Please request a new one.
              <div className="mt-2">
                <Link href="/forgot-password" className="text-blue-700 hover:underline">
                  Request a new reset link
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <div>
              <label className="block text-sm mb-1">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className="input pl-10"
                  type="password"
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={!hasParams}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Confirm new password</label>
              <input
                className="input"
                type="password"
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                autoComplete="new-password"
                required
                disabled={!hasParams}
              />
            </div>

            {done ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <div>Password reset successful. Redirecting to login…</div>
              </div>
            ) : null}

            {err ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div>{err}</div>
              </div>
            ) : null}

            <button disabled={busy || !hasParams} className="btn btn-primary">
              {busy ? "Resetting..." : "Reset password"}
            </button>

            <Link href="/login" className="btn btn-ghost inline-flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
