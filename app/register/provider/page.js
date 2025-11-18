"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PROVIDER_TYPES, COUNCILS } from "@/lib/constants";
import {
  Stethoscope,
  UserRound,
  Mail,
  Lock,
  Phone,
  Calendar,
  BadgeCheck,
  Hash,
  Banknote,
  PencilLine,
  Globe2,
  MapPin,
  ShieldCheck,
  ListChecks,
  FileCheck2,
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";

// --- Nigeria-only choices ---
const COUNTRY_CHOICES = [{ value: "nigeria", label: "Nigeria" }];
const NIGERIA_STATES = [
  { value: "", label: "-- Select state --" },
  { value: "abia", label: "Abia" }, { value: "adamawa", label: "Adamawa" },
  { value: "akwa_ibom", label: "Akwa Ibom" }, { value: "anambra", label: "Anambra" },
  { value: "bauchi", label: "Bauchi" }, { value: "bayelsa", label: "Bayelsa" },
  { value: "benue", label: "Benue" }, { value: "borno", label: "Borno" },
  { value: "cross_river", label: "Cross River" }, { value: "delta", label: "Delta" },
  { value: "ebonyi", label: "Ebonyi" }, { value: "edo", label: "Edo" },
  { value: "ekiti", label: "Ekiti" }, { value: "enugu", label: "Enugu" },
  { value: "gombe", label: "Gombe" }, { value: "imo", label: "Imo" },
  { value: "jigawa", label: "Jigawa" }, { value: "kaduna", label: "Kaduna" },
  { value: "kano", label: "Kano" }, { value: "katsina", label: "Katsina" },
  { value: "kebbi", label: "Kebbi" }, { value: "kogi", label: "Kogi" },
  { value: "kwara", label: "Kwara" }, { value: "lagos", label: "Lagos" },
  { value: "nasarawa", label: "Nasarawa" }, { value: "niger", label: "Niger" },
  { value: "ogun", label: "Ogun" }, { value: "ondo", label: "Ondo" },
  { value: "osun", label: "Osun" }, { value: "oyo", label: "Oyo" },
  { value: "plateau", label: "Plateau" }, { value: "rivers", label: "Rivers" },
  { value: "sokoto", label: "Sokoto" }, { value: "taraba", label: "Taraba" },
  { value: "yobe", label: "Yobe" }, { value: "zamfara", label: "Zamfara" },
  { value: "fct", label: "FCT (Abuja)" },
];

// typical provider doc kinds
const PROVIDER_DOC_KINDS = [
  { value: "license", label: "Practice License" },
  { value: "degree", label: "Degree/Certificate" },
  { value: "passport", label: "Passport/ID" },
  { value: "other", label: "Other" },
];

// --- Specialties options (values are what backend receives) ---
const SPECIALTIES = [
  { value: "General Practice", label: "General Practice" },
  { value: "Family Medicine", label: "Family Medicine" },
  { value: "Internal Medicine", label: "Internal Medicine" },
  { value: "Cardiology", label: "Cardiology" },
  { value: "Neurology", label: "Neurology" },
  { value: "Pediatrics", label: "Pediatrics" },
  { value: "Obstetrics & Gynecology", label: "Obstetrics & Gynecology" },
  { value: "Psychiatry", label: "Psychiatry" },
  { value: "Surgery", label: "Surgery" },
  { value: "Orthopedics", label: "Orthopedics" },
  { value: "Dermatology", label: "Dermatology" },
  { value: "Ophthalmology", label: "Ophthalmology" },
  { value: "ENT", label: "ENT" },
  { value: "Radiology", label: "Radiology" },
  { value: "Anesthesiology", label: "Anesthesiology" },
];

export default function ProviderRegisterPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    provider_type: "DOCTOR",
    license_council: "MDCN",
    license_number: "",
    license_expiry: "",
    years_experience: "",
    bio: "",
    phone: "",
    country: "nigeria",
    state: "",
    lga: "",
    address: "",
    consultation_fee: "",
    specialties: [],     // <-- multi-select values live here
    extra_specialties: "", // optional free-text for “Other” / extras
  });
  const [documents, setDocuments] = useState([{ kind: "license", file: null }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function upd(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function addDoc() {
    setDocuments((d) => [...d, { kind: "license", file: null }]);
  }

  function removeDoc(i) {
    setDocuments((d) => d.filter((_, idx) => idx !== i));
  }

  function setDoc(i, key, value) {
    setDocuments((d) =>
      d.map((row, idx) => (idx === i ? { ...row, [key]: value } : row))
    );
  }

  // handle specialties as pill/chip multi-select
  function toggleSpecialty(value) {
    setForm((prev) => {
      const current = Array.isArray(prev.specialties) ? prev.specialties : [];
      const exists = current.includes(value);
      const next = exists
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, specialties: next };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const payload = {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        provider_type: form.provider_type,
        license_council: form.license_council,
        license_number: form.license_number,
      };
      if (form.license_expiry) payload.license_expiry = form.license_expiry;
      if (form.years_experience)
        payload.years_experience = Number(form.years_experience);
      if (form.bio) payload.bio = form.bio;
      if (form.phone) payload.phone = form.phone;
      if (form.country) payload.country = form.country;
      if (form.state) payload.state = form.state;
      if (form.lga) payload.lga = form.lga;
      if (form.address) payload.address = form.address;
      if (form.consultation_fee)
        payload.consultation_fee = Number(form.consultation_fee);

      // Merge multi-select specialties + extra free-text
      const fromMulti = Array.isArray(form.specialties)
        ? form.specialties
        : [];
      const fromExtra = (form.extra_specialties || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const specs = Array.from(
        new Set([...fromMulti, ...fromExtra]) // de-duplicate
      );

      if (specs.length) {
        // Backend still receives `specialties` as array of strings
        payload.specialties = specs;
      }

      const docs = documents.filter((d) => d.file);
      let res;

      if (docs.length) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) =>
          fd.append(k, String(v))
        );
        docs.forEach((d, i) => {
          fd.append(`documents.${i}.kind`, d.kind || "other");
          fd.append(`documents.${i}.file`, d.file);
        });
        res = await apiFetch("/providers/self-register/", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await apiFetch("/providers/self-register/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setOk(
        "Provider registration has been submitted successfully. Await verification."
      );
      setForm((s) => ({
        ...s,
        password: "",
        license_number: "",
        license_expiry: "",
        years_experience: "",
        consultation_fee: "",
        specialties: [],
        extra_specialties: "",
      }));
      setDocuments([{ kind: "license", file: null }]);
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
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600/10">
            <Stethoscope className="h-6 w-6 text-blue-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Independent Provider Registration
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create your account and profile. Verification is required before
              access is granted.
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
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}
          {ok && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {ok}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <form onSubmit={onSubmit} className="p-6 md:p-8 grid gap-8">
            {/* Account */}
            <section className="rounded-xl border border-slate-100">
              <SectionHead
                icon={UserRound}
                title="Account"
                subtitle="Your NIEMR login details."
              />
              <div className="p-4 grid md:grid-cols-2 gap-4">
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => upd("email", e.target.value)}
                  required
                  icon={Mail}
                  placeholder="you@provider.com"
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
            </section>

            {/* Licensing */}
            <section className="rounded-xl border border-slate-100">
              <SectionHead
                icon={BadgeCheck}
                title="Licensing"
                subtitle="Your professional registration details."
              />
              <div className="p-4 grid md:grid-cols-3 gap-4">
                <Select
                  label="Provider Type"
                  value={form.provider_type}
                  onChange={(e) => upd("provider_type", e.target.value)}
                  options={PROVIDER_TYPES}
                  icon={Stethoscope}
                />
                <Select
                  label="Council"
                  value={form.license_council}
                  onChange={(e) => upd("license_council", e.target.value)}
                  options={COUNCILS}
                  icon={ListChecks}
                />
                <Field
                  label="License Number"
                  value={form.license_number}
                  onChange={(e) => upd("license_number", e.target.value)}
                  required
                  icon={Hash}
                  placeholder="MDCN/123456"
                />
              </div>
              <div className="px-4 pb-4 grid md:grid-cols-3 gap-4">
                <Field
                  label="License Expiry"
                  type="date"
                  value={form.license_expiry}
                  onChange={(e) => upd("license_expiry", e.target.value)}
                  icon={Calendar}
                />
                <Field
                  label="Years Experience"
                  type="number"
                  value={form.years_experience}
                  onChange={(e) => upd("years_experience", e.target.value)}
                  placeholder="10"
                />
                <Field
                  label="Consultation Fee"
                  type="number"
                  value={form.consultation_fee}
                  onChange={(e) => upd("consultation_fee", e.target.value)}
                  icon={Banknote}
                  placeholder="2500"
                />
              </div>
            </section>

            {/* Profile */}
            <section className="rounded-xl border border-slate-100">
              <SectionHead
                icon={PencilLine}
                title="Profile"
                subtitle="Optional bio to show on your profile."
              />
              <div className="p-4">
                <Field
                  as="textarea"
                  rows={4}
                  label="Bio"
                  value={form.bio}
                  onChange={(e) => upd("bio", e.target.value)}
                  placeholder="Short introduction, specialties, languages…"
                />
              </div>
            </section>

            {/* Contact & Address */}
            <section className="rounded-xl border border-slate-100">
              <SectionHead
                icon={ShieldCheck}
                title="Contact & Address"
                subtitle="How we can reach you and where you practice."
              />
              <div className="p-4 grid md:grid-cols-3 gap-4">
                <Field
                  label="Phone (E.+234)"
                  value={form.phone}
                  onChange={(e) => upd("phone", e.target.value)}
                  icon={Phone}
                  placeholder="+2348012345678"
                />
                <Select
                  label="Country"
                  value={form.country}
                  onChange={(e) => upd("country", e.target.value)}
                  options={COUNTRY_CHOICES}
                  icon={Globe2}
                />
                <Select
                  label="State"
                  value={form.state}
                  onChange={(e) => upd("state", e.target.value)}
                  options={NIGERIA_STATES}
                  icon={MapPin}
                />
                <Field
                  label="LGA"
                  value={form.lga}
                  onChange={(e) => upd("lga", e.target.value)}
                />
              </div>
              <div className="px-4 pb-4">
                <Field
                  as="textarea"
                  rows={2}
                  label="Address"
                  value={form.address}
                  onChange={(e) => upd("address", e.target.value)}
                />
              </div>
            </section>

            {/* Specialties */}
            <section className="rounded-xl border border-slate-100">
              <SectionHead
                icon={Stethoscope}
                title="Specialties"
                subtitle="Select one or more specialties. You can also add extra ones."
              />
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Specialties
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    Click to select. Click again to remove. You can pick more than one.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map((opt) => {
                      const active = (form.specialties || []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleSpecialty(opt.value)}
                          className={
                            "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition " +
                            (active
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:text-blue-700")
                          }
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Field
                  label="Additional specialties (optional, comma-separated)"
                  value={form.extra_specialties}
                  onChange={(e) => upd("extra_specialties", e.target.value)}
                  placeholder="e.g. Telemedicine, Palliative Care"
                />
              </div>
            </section>

            {/* Documents */}
            <section className="rounded-xl border border-slate-100">
              <SectionHead
                icon={FileCheck2}
                title="Documents"
                subtitle="Upload credentials (PDF/JPG/PNG). Add multiple as needed."
              />
              <div className="p-4 space-y-3">
                {documents.map((row, i) => (
                  <div
                    key={i}
                    className="grid md:grid-cols-[1fr_2fr_auto] gap-3 items-end"
                  >
                    <Select
                      label="Kind"
                      value={row.kind}
                      onChange={(e) => setDoc(i, "kind", e.target.value)}
                      options={PROVIDER_DOC_KINDS}
                    />
                    <FileField
                      label="File"
                      onChange={(file) => setDoc(i, "file", file)}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 hover:border-red-200 hover:text-red-700"
                      onClick={() => removeDoc(i)}
                      disabled={documents.length === 1}
                      title={
                        documents.length === 1 ? "At least one row" : "Remove"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
                  onClick={addDoc}
                >
                  <Plus className="h-4 w-4" />
                  Add another document
                </button>
              </div>
            </section>

            {/* Footer actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Your information is encrypted and reviewed for verification.
              </div>
              <div className="flex gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={busy}
                >
                  {busy ? "Submitting..." : "Register"}
                </button>
                <a
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-slate-800 hover:border-blue-200 hover:text-blue-700"
                  href="/register"
                >
                  Back
                </a>
              </div>
            </div>
          </form>
        </div>

        {/* Back (mobile) */}
        <div className="mt-6 sm:hidden">
          <a
            href="/register"
            className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── helpers ─────────────── */

function SectionHead({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
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
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        ) : null}
        <InputEl
          className={`w-full ${
            as === "textarea" ? "min-h-[96px] py-2" : "h-11"
          } rounded-lg border border-slate-200 bg-white/60 px-3 ${
            Icon ? "pl-10" : ""
          } focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600/40 ${className || ""}`}
          {...props}
        />
      </div>
    </div>
  );
}

function Select({ label, options, icon: Icon, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        ) : null}
        <select
          className={`w-full h-11 rounded-lg border border-slate-200 bg-white/60 px-3 pr-8 ${
            Icon ? "pl-10" : ""
          } focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600/40`}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FileField({ label, onChange, accept }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        className="block w-full rounded-lg border border-slate-200 bg-white/60 p-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white hover:file:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600/40"
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
