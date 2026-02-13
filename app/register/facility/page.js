"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { FACILITY_TYPES, CONTROLLED_BY } from "@/lib/constants";
import {
  Building2,
  UserCog,
  Mail,
  Lock,
  Phone,
  ClipboardList,
  Layers,
  Globe2,
  MapPin,
  Hash,
  BedDouble,
  ShieldCheck,
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

// simple suggestions for doc kinds
const FACILITY_DOC_KINDS = [
  { value: "license", label: "License/Permit" },
  { value: "cac", label: "CAC/Registration" },
  { value: "nhis", label: "NHIS Letter" },
  { value: "other", label: "Other" },
];

export default function FacilityRegisterPage() {
  const [form, setForm] = useState({
    admin_email:"", admin_password:"", admin_first_name:"", admin_last_name:"", admin_phone:"",
    name:"", facility_type:"", controlled_by:"",
    country:"nigeria", state:"", lga:"", address:"",
    email:"", phone:"",
    registration_number:"", nhis_approved:false, nhis_number:"", total_bed_capacity:"",
  });
  const [documents, setDocuments] = useState([{ kind: "license", file: null }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function upd(k,v){ setForm(s=>({ ...s, [k]: v })); }
  function updbool(k,v){ setForm(s=>({ ...s, [k]: !!v })); }

  function addDoc(){ setDocuments(d=>[...d, { kind: "license", file: null }]); }
  function removeDoc(i){ setDocuments(d=>d.filter((_,idx)=>idx!==i)); }
  function setDoc(i, key, value){
    setDocuments(d => d.map((row, idx) => idx===i ? { ...row, [key]: value } : row));
  }

  async function onSubmit(e) {
    e.preventDefault(); setBusy(true); setErr(""); setOk("");
    try {
      // base payload (text)
      const payload = {
        admin_email: form.admin_email,
        admin_password: form.admin_password,
        admin_first_name: form.admin_first_name,
        admin_last_name: form.admin_last_name,
        ...(form.admin_phone ? { admin_phone: form.admin_phone } : {}),

        name: form.name,
        country: form.country,
        ...(form.facility_type ? { facility_type: form.facility_type } : {}),
        ...(form.controlled_by ? { controlled_by: form.controlled_by } : {}),
        ...(form.state ? { state: form.state } : {}),
        ...(form.lga ? { lga: form.lga } : {}),
        ...(form.address ? { address: form.address } : {}),

        email: form.email,
        phone: form.phone,
        ...(form.registration_number ? { registration_number: form.registration_number } : {}),
        ...(form.nhis_approved ? { nhis_approved: true } : {}),
        ...(form.nhis_number ? { nhis_number: form.nhis_number } : {}),
        ...(form.total_bed_capacity ? { total_bed_capacity: Number(form.total_bed_capacity) } : {}),
      };

      const docs = documents.filter(d=>d.file);
      let res;

      if (docs.length) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k,v]) => fd.append(k, String(v)));

        docs.forEach((d, i) => {
          fd.append(`documents.${i}.kind`, d.kind || "other");
          fd.append(`documents.${i}.file`, d.file);
        });

        res = await apiFetch("/facilities/register-admin/", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await apiFetch("/facilities/register-admin/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const facilityName = res?.facility?.name || "your facility";
      const detail = res?.detail || "Facility registration submitted. You will be able to sign in after platform approval.";
      setOk(`${detail} (${facilityName})`);
      setForm(s => ({ ...s, admin_password:"" }));
      setDocuments([{ kind: "license", file: null }]);
    } catch(e){ setErr(e.message || "Error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-[calc(100dvh-68px)]">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-600/10 grid place-items-center">
            <Building2 className="h-6 w-6 text-blue-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Healthcare Facility Registration
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              This creates a facility and the first <span className="font-medium">Super Admin</span>.
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

        {/* Form shell */}
        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <form onSubmit={onSubmit} className="p-6 md:p-8 grid gap-8">
            {/* Admin */}
            <section className="rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                  <UserCog className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Super Admin</h2>
                  <p className="text-xs text-slate-500">Primary administrator account for this facility.</p>
                </div>
              </div>
              <div className="p-4 grid md:grid-cols-2 gap-4">
                <Field
                  label="Admin Email"
                  type="email"
                  value={form.admin_email}
                  onChange={(e)=>upd("admin_email", e.target.value)}
                  required
                  icon={Mail}
                  placeholder="admin@facility.com"
                />
                <Field
                  label="Admin Password"
                  type="password"
                  value={form.admin_password}
                  onChange={(e)=>upd("admin_password", e.target.value)}
                  required
                  icon={Lock}
                  placeholder="••••••••"
                />
                <Field
                  label="First name"
                  value={form.admin_first_name}
                  onChange={(e)=>upd("admin_first_name", e.target.value)}
                  required
                />
                <Field
                  label="Last name"
                  value={form.admin_last_name}
                  onChange={(e)=>upd("admin_last_name", e.target.value)}
                  required
                />
                <Field
                  label="Phone"
                  value={form.admin_phone}
                  onChange={(e)=>upd("admin_phone", e.target.value)}
                  icon={Phone}
                  placeholder="+2348012345678"
                />
              </div>
            </section>

            {/* Facility */}
            <section className="rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                  <ClipboardList className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Facility Details</h2>
                  <p className="text-xs text-slate-500">Core information about the healthcare facility.</p>
                </div>
              </div>

              <div className="p-4 grid md:grid-cols-2 gap-4">
                <Field
                  label="Name"
                  value={form.name}
                  onChange={(e)=>upd("name", e.target.value)}
                  required
                />
                <Select
                  label="Facility Type"
                  value={form.facility_type}
                  onChange={(e)=>upd("facility_type", e.target.value)}
                  options={[{value:"",label:"--"}, ...FACILITY_TYPES]}
                  icon={Layers}
                />
                <Select
                  label="Controlled By"
                  value={form.controlled_by}
                  onChange={(e)=>upd("controlled_by", e.target.value)}
                  options={[{value:"",label:"--"}, ...CONTROLLED_BY]}
                />
                <Select
                  label="Country"
                  value={form.country}
                  onChange={(e)=>upd("country", e.target.value)}
                  options={COUNTRY_CHOICES}
                  icon={Globe2}
                />
                <Select
                  label="State"
                  value={form.state}
                  onChange={(e)=>upd("state", e.target.value)}
                  options={NIGERIA_STATES}
                  icon={MapPin}
                />
                <Field
                  label="LGA"
                  value={form.lga}
                  onChange={(e)=>upd("lga", e.target.value)}
                />
              </div>

              <div className="px-4 pb-4">
                <Field
                  label="Address"
                  value={form.address}
                  onChange={(e)=>upd("address", e.target.value)}
                  as="textarea"
                  rows={2}
                />
              </div>
            </section>

            {/* Contact & Regulatory */}
            <section className="rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Contact & Regulatory</h2>
                  <p className="text-xs text-slate-500">Official contact details and registration data.</p>
                </div>
              </div>

              <div className="p-4 grid md:grid-cols-2 gap-4">
                <Field
                  label="Facility Email"
                  type="email"
                  value={form.email}
                  onChange={(e)=>upd("email", e.target.value)}
                  required
                  icon={Mail}
                  placeholder="contact@facility.com"
                />
                <Field
                  label="Facility Phone"
                  value={form.phone}
                  onChange={(e)=>upd("phone", e.target.value)}
                  required
                  icon={Phone}
                  placeholder="+2348012345678"
                />
                <Field
                  label="Registration Number"
                  value={form.registration_number}
                  onChange={(e)=>upd("registration_number", e.target.value)}
                  icon={Hash}
                />
                <Field
                  label="Total Bed Capacity"
                  type="number"
                  value={form.total_bed_capacity}
                  onChange={(e)=>upd("total_bed_capacity", e.target.value)}
                  icon={BedDouble}
                  min="0"
                />
              </div>

              <div className="px-4 pb-4 space-y-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    id="nhis_approved"
                    type="checkbox"
                    checked={form.nhis_approved}
                    onChange={(e)=>updbool("nhis_approved", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  NHIS Approved?
                </label>
                <Field
                  label="NHIS Number"
                  value={form.nhis_number}
                  onChange={(e)=>upd("nhis_number", e.target.value)}
                />
              </div>
            </section>

            {/* Documents */}
            <section className="rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                  <FileCheck2 className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Documents</h2>
                  <p className="text-xs text-slate-500">Upload facility credentials (PDF/JPG/PNG). Add multiple as needed.</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {documents.map((row, i)=>(
                  <div key={i} className="grid md:grid-cols-[1fr_2fr_auto] gap-3 items-end">
                    <Select
                      label="Kind"
                      value={row.kind}
                      onChange={(e)=>setDoc(i,"kind", e.target.value)}
                      options={FACILITY_DOC_KINDS}
                    />
                    <FileField
                      label="File"
                      onChange={(file)=>setDoc(i,"file", file)}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 hover:border-red-200 hover:text-red-700"
                      onClick={()=>removeDoc(i)}
                      disabled={documents.length===1}
                      title={documents.length===1 ? "At least one row" : "Remove"}
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
                Your data is protected with industry-standard security.
              </div>
              <div className="flex gap-3">
                <button className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-5 text-white hover:bg-blue-700 disabled:opacity-60" disabled={busy}>
                  {busy ? "Submitting..." : "Create Facility"}
                </button>
                <a className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-slate-800 hover:border-blue-200 hover:text-blue-700" href="/register">
                  Back
                </a>
              </div>
            </div>
          </form>
        </div>

        {/* Back link (mobile) */}
        <div className="mt-6 sm:hidden">
          <a href="/register" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────── components ───────────────────────────────── */

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

function FileField({ label, onChange, accept }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        className="block w-full rounded-lg border border-slate-200 bg-white/60 p-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white hover:file:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600/40"
        type="file"
        accept={accept}
        onChange={(e)=>onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
