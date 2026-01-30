"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  HeartHandshake,
  Mail,
  Lock,
  UserRound,
  ArrowLeft,
  ShieldCheck,
  Users,
  KeyRound,
  ClipboardCheck,
} from "lucide-react";


export default function OutreachSuperAdminRegisterPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function upd(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setOk("");

    try {
      if ((form.password || "") !== (form.confirm_password || "")) {
        throw new Error("Passwords do not match.");
      }

      const payload = {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        role: "SUPER_ADMIN",
      };

      await apiFetch("/accounts/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setOk("Outreach Super Admin created successfully. You can now sign in to the Outreach workspace.");
      setForm({ email: "", password: "", confirm_password: "", first_name: "", last_name: "" });
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-68px)]">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-600/10 grid place-items-center">
            <HeartHandshake className="h-6 w-6 text-amber-800" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Outreach Super Admin Registration
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              This creates the <span className="font-medium">Outreach Super Admin</span> account that can create outreach
              events, invite staff, and generate reports.
            </p>
          </div>
          <a
            href="/register"
            className="hidden sm:inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>
        </header>

        {/* Alerts */}
        <div className="space-y-3">
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
          )}
          {ok && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {ok}
              <div className="mt-2">
                <a href="/login/outreach" className="inline-flex items-center gap-2 text-blue-700 hover:underline">
                  Go to Outreach login
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-5">
          {/* Form */}
          <div className="md:col-span-3 rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <form onSubmit={onSubmit} className="p-6 md:p-8 grid gap-8">
              <SectionHead
                icon={UserRound}
                title="Account"
                subtitle="Your login details for the Outreach Super Admin account."
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => upd("email", e.target.value)}
                  required
                  icon={Mail}
                  placeholder="admin@outreach.com"
                />

                <Field
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => upd("password", e.target.value)}
                  required
                  icon={Lock}
                  placeholder="••••••••"
                />

                <Field
                  label="Confirm password"
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => upd("confirm_password", e.target.value)}
                  required
                  icon={Lock}
                  placeholder="••••••••"
                />

                <div className="hidden md:block" />

                <Field
                  label="First name"
                  value={form.first_name}
                  onChange={(e) => upd("first_name", e.target.value)}
                  required
                />

                <Field
                  label="Last name"
                  value={form.last_name}
                  onChange={(e) => upd("last_name", e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  This account is system-level (not tied to a facility)
                </div>

                <button
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-amber-700 px-5 text-white hover:bg-amber-800 disabled:opacity-60"
                  disabled={busy}
                >
                  {busy ? "Creating..." : "Create Outreach Super Admin"}
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Already have an account?{" "}
                <a href="/login/outreach" className="text-blue-700 hover:underline">
                  Sign in to Outreach
                </a>
              </div>
            </form>
          </div>

          {/* Info card */}
          <div className="md:col-span-2 rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-600/10">
                  <HeartHandshake className="h-5 w-5 text-amber-800" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">How outreach staff get access</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Outreach staff do not register themselves. You (the Outreach Super Admin) create temporary staff inside
                    an outreach event.
                  </p>
                </div>
              </div>

              <ul className="mt-5 grid gap-3 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-700" />
                  Create staff in an outreach event (roles + permissions)
                </li>
                <li className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-violet-700" />
                  Staff receive a temporary password to sign in
                </li>
                <li className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-blue-700" />
                  Close outreach to automatically disable all outreach logins
                </li>
              </ul>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Security note
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  In production, it’s best to restrict who can create Super Admin accounts (e.g., one-time setup token or
                  first-admin-only rule).
                </p>
              </div>

              <div className="mt-5">
                <a
                  href="/login/outreach"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  Go to Outreach login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────── components ───────────────────────────────── */

function SectionHead({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-600/10">
        <Icon className="h-5 w-5 text-amber-800" />
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, as, ...props }) {
  const InputEl = as === "textarea" ? "textarea" : "input";
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        ) : null}
        <InputEl
          className={`w-full ${as === "textarea" ? "min-h-[84px] py-2" : "h-11"} rounded-lg border border-slate-200 bg-white/60 px-3 ${
            Icon ? "pl-10" : ""
          } focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600/40`}
          {...props}
        />
      </div>
    </div>
  );
}
