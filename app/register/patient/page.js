"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BLOOD_GROUPS, GENOTYPES, INSURANCE_STATUSES } from "@/lib/constants";
import {
  UserRound,
  Mail,
  Lock,
  Phone,
  Calendar,
  Globe2,
  MapPin,
  Home,
  HeartPulse,
  Droplets,
  Dna,
  ShieldCheck,
  Building2,
  ArrowLeft,
} from "lucide-react";

export default function PatientRegisterPage() {
  const [form, setForm] = useState({
    email: "", password: "",
    first_name: "", last_name: "", dob: "",
    phone: "", country: "", state: "", lga: "", address: "",
    gender: "", blood_group: "", genotype: "",
    insurance_status: "SELF_PAY", hmo_id: "", hmo_plan: "",
  });
  const [hmos, setHmos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/patients/hmos/");
        setHmos(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
    })();
  }, []);

  function upd(k, v) { setForm((s) => ({ ...s, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault(); setBusy(true); setErr(""); setOk("");
    try {
      const payload = { ...form };
      if (payload.insurance_status !== "INSURED") {
        delete payload.hmo_id; delete payload.hmo_plan;
      }
      await apiFetch("/patients/self-register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setOk("Registration successful. You can now sign in.");
      setForm({
        email:"",password:"",first_name:"",last_name:"",dob:"",
        phone:"",country:"",state:"",lga:"",address:"",
        gender:"",blood_group:"",genotype:"",
        insurance_status:"SELF_PAY",hmo_id:"",hmo_plan:""
      });
    } catch (e) { setErr(e.message || "Error"); }
    finally { setBusy(false); }
  }

  const insured = form.insurance_status === "INSURED";

  return (
    <div className="min-h-[calc(100dvh-68px)]">
      <div className="mx-auto max-w-4xl">
        {/* Heading */}
        <header className="mb-6 flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600/10">
            <UserRound className="h-6 w-6 text-blue-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Patient Registration
            </h1>
            <p className="mt-1 text-sm text-slate-600">Create a patient account to access results, medications, and appointments.</p>
          </div>
          <a href="/login" className="hidden sm:inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </a>
        </header>

        {/* Alerts */}
        <div className="space-y-3">
          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
          {ok  && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div>}
        </div>

        {/* Form shell */}
        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <form onSubmit={onSubmit} className="p-6 md:p-8 grid gap-8">
            {/* Account */}
            <SectionHead icon={UserRound} title="Account" subtitle="Your login details." />
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Email" type="email" value={form.email} onChange={(e)=>upd("email", e.target.value)} required icon={Mail} placeholder="you@email.com" />
              <Field label="Password" type="password" value={form.password} onChange={(e)=>upd("password", e.target.value)} required icon={Lock} placeholder="••••••••" />
              <Field label="First name" value={form.first_name} onChange={(e)=>upd("first_name", e.target.value)} required />
              <Field label="Last name"  value={form.last_name}  onChange={(e)=>upd("last_name", e.target.value)} required />
              <Field label="Date of Birth" type="date" value={form.dob} onChange={(e)=>upd("dob", e.target.value)} required icon={Calendar} />
              <Field label="Phone (E.164)" value={form.phone} onChange={(e)=>upd("phone", e.target.value)} icon={Phone} placeholder="+2348012345678" />
            </div>

            {/* Address */}
            <SectionHead icon={Home} title="Address" subtitle="Where you live." />
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Country" value={form.country} onChange={(e)=>upd("country", e.target.value)} icon={Globe2} placeholder="Nigeria" />
              <Field label="State" value={form.state} onChange={(e)=>upd("state", e.target.value)} icon={MapPin} placeholder="Lagos" />
              <Field label="LGA" value={form.lga} onChange={(e)=>upd("lga", e.target.value)} placeholder="Ikeja" />
            </div>
            <Field as="textarea" rows={2} label="Address" value={form.address} onChange={(e)=>upd("address", e.target.value)} />

            {/* Clinical */}
            <SectionHead icon={HeartPulse} title="Clinical (optional)" subtitle="These help your providers give better care." />
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Gender" value={form.gender} onChange={(e)=>upd("gender", e.target.value)} placeholder="Female / Male / Other" />
              <Select label="Blood Group" value={form.blood_group} onChange={(e)=>upd("blood_group", e.target.value)} options={[{value:"",label:"--"}, ...BLOOD_GROUPS]} icon={Droplets} />
              <Select label="Genotype" value={form.genotype} onChange={(e)=>upd("genotype", e.target.value)} options={[{value:"",label:"--"}, ...GENOTYPES]} icon={Dna} />
            </div>

            {/* Insurance */}
            <SectionHead icon={ShieldCheck} title="Insurance" subtitle="Self-pay or insured with an HMO." />
            <div className="grid md:grid-cols-3 gap-4">
              <Select label="Insurance Status" value={form.insurance_status} onChange={(e)=>upd("insurance_status", e.target.value)} options={INSURANCE_STATUSES} icon={ShieldCheck} />
              {insured ? (
                <>
                  <Select
                    label="HMO"
                    value={form.hmo_id}
                    onChange={(e)=>upd("hmo_id", e.target.value)}
                    options={[{ value: "", label: "--" }, ...hmos.map(h=>({ value: String(h.id), label: h.name }))]}
                    icon={Building2}
                  />
                  <Field label="HMO Plan" value={form.hmo_plan} onChange={(e)=>upd("hmo_plan", e.target.value)} />
                </>
              ) : (
                <div className="hidden md:block" />
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Your data is protected and only shared with your providers.
              </div>
              <div className="flex gap-3">
                <button className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:opacity-60" disabled={busy}>
                  {busy ? "Submitting..." : "Create account"}
                </button>
                <a className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-slate-800 hover:border-blue-200 hover:text-blue-700" href="/login">
                  Back to Login
                </a>
              </div>
            </div>
          </form>
        </div>

        {/* Back link (mobile) */}
        <div className="mt-6 sm:hidden">
          <a href="/login" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── UI primitives (UI-only) ──────────────────────────── */

function SectionHead({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
        <Icon className="h-5 w-5 text-blue-700" />
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, as, className, ...props }) {
  const InputEl = as === "textarea" ? "textarea" : "input";
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /> : null}
        <InputEl
          className={`w-full ${as === "textarea" ? "min-h-[84px] py-2" : "h-11"} rounded-lg border border-slate-200 bg-white/60 px-3 ${Icon ? "pl-10" : ""} focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600/40`}
          {...props}
        />
      </div>
    </div>
  );
}

function Select({ label, options, icon: Icon, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /> : null}
        <select
          className={`w-full h-11 rounded-lg border border-slate-200 bg-white/60 px-3 pr-8 ${Icon ? "pl-10" : ""} focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600/40`}
          {...props}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
