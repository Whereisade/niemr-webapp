// app/login/patient/page.js
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  UserRound,
  FileText,
  Pill,
  CalendarCheck,
  ShieldCheck,
  ArrowLeft,
  Mail,
  Lock,
} from "lucide-react";

export default function PatientLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);

    const email = e.currentTarget.email.value.trim();
    const password = e.currentTarget.password.value;

    try {
      // unchanged logic
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.detail || "Invalid credentials");
      }

      router.replace("/patient");
    } catch (e) {
      setErr(e.message || "Login failed");
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[70vh]">
      {/* soft background accents (same as provider) */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      <div className="container grid items-center gap-10 py-10 md:grid-cols-2">
        {/* Left hero / benefits – mirrors provider structure */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <UserRound className="h-3.5 w-3.5" />
            Patient Portal
          </div>

          <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Sign in to view your care
          </h1>
          <p className="mt-2 text-slate-600">
            Access your results, medications, and appointment reminders — all in one secure place.
          </p>

          <ul className="mt-5 grid gap-3 text-sm">
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-700" />
              <span>Downloadable lab & imaging reports</span>
            </li>
            <li className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-fuchsia-700" />
              <span>Up-to-date prescriptions and instructions</span>
            </li>
            <li className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-700" />
              <span>Appointments with reminders and status</span>
            </li>
          </ul>

          <a
            href="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login types
          </a>
        </div>

        {/* Right auth card – same shell as provider */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          {/* gradient top border */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="p-6 md:p-8">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                  <UserRound className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Patient Sign In</h2>
                  <p className="text-xs text-slate-500">Use your patient email and password.</p>
                </div>
              </div>
            </div>

            {/* Your existing email/password form (styled like provider card) */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white/60 pl-10 pr-3 outline-none focus:border-blue-600/40 focus:ring-2 focus:ring-blue-600/30"
                    placeholder="you@example.com"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    name="password"
                    type="password"
                    required
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white/60 pl-10 pr-3 outline-none focus:border-blue-600/40 focus:ring-2 focus:ring-blue-600/30"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {err ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? "Logging in…" : "Login"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Private & encrypted access
              </span>
              <a href="/register/patient" className="text-blue-700 hover:underline">
                Create patient account
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
