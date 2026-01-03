"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setDone(false);

    try {
      const r = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // For security, backend returns 200 even if email doesn't exist.
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.detail || "Could not send reset link");
      }
      setDone(true);
    } catch (e2) {
      setErr(e2?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="card w-full max-w-md">
        <div className="card-body">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-700 font-semibold">
            NIEMR
          </div>

          <h2 className="h2 mt-1">Forgot Password</h2>
          <p className="muted text-sm">
            Enter your email and we’ll send you a password reset link.
          </p>

          <div className="mt-4 grid gap-3">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className="input pl-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {done ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <div>
                  If an account exists for that email, a reset link has been sent.
                  Please check your inbox (and spam folder).
                </div>
              </div>
            ) : null}

            {err ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div>{err}</div>
              </div>
            ) : null}

            <button disabled={busy} className="btn btn-primary">
              {busy ? "Sending..." : "Send reset link"}
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
