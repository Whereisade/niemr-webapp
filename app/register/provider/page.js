"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PROVIDER_TYPES, COUNCILS } from "@/lib/constants";

export default function ProviderRegisterPage() {
  const [form, setForm] = useState({
    email:"", password:"", first_name:"", last_name:"",
    provider_type:"DOCTOR", license_council:"MDCN", license_number:"",
    license_expiry:"", years_experience:"", bio:"",
    phone:"", country:"", state:"", lga:"", address:"",
    consultation_fee:"", specialties_csv: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function upd(k,v){ setForm((s)=>({ ...s, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault(); setBusy(true); setErr(""); setOk("");
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
      if (form.years_experience) payload.years_experience = Number(form.years_experience);
      if (form.bio) payload.bio = form.bio;
      if (form.phone) payload.phone = form.phone;
      if (form.country) payload.country = form.country;
      if (form.state) payload.state = form.state;
      if (form.lga) payload.lga = form.lga;
      if (form.address) payload.address = form.address;
      if (form.consultation_fee) payload.consultation_fee = Number(form.consultation_fee);
      const specs = (form.specialties_csv || "").split(",").map(s=>s.trim()).filter(Boolean);
      if (specs.length) payload.specialties = specs;

      await apiFetch("/providers/self-register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setOk("Provider registration submitted. Await verification.");
      setForm({ ...form, password:"", license_number:"", license_expiry:"", years_experience:"", consultation_fee:"", specialties_csv:"" });
    } catch(e){ setErr(e.message || "Error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto card">
      <div className="card-body">
        <h2 className="h2">Independent Provider Registration</h2>
        <p className="muted text-sm">Create an account and profile (verification required).</p>

        <form onSubmit={onSubmit} className="mt-4 grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Email" type="email" value={form.email} onChange={(e)=>upd("email", e.target.value)} required />
            <Field label="Password" type="password" value={form.password} onChange={(e)=>upd("password", e.target.value)} required />
            <Field label="First name" value={form.first_name} onChange={(e)=>upd("first_name", e.target.value)} required />
            <Field label="Last name"  value={form.last_name}  onChange={(e)=>upd("last_name", e.target.value)} required />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Select label="Provider Type" value={form.provider_type} onChange={(e)=>upd("provider_type", e.target.value)} options={PROVIDER_TYPES} />
            <Select label="Council" value={form.license_council} onChange={(e)=>upd("license_council", e.target.value)} options={COUNCILS} />
            <Field label="License Number" value={form.license_number} onChange={(e)=>upd("license_number", e.target.value)} required />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="License Expiry" type="date" value={form.license_expiry} onChange={(e)=>upd("license_expiry", e.target.value)} />
            <Field label="Years Experience" type="number" value={form.years_experience} onChange={(e)=>upd("years_experience", e.target.value)} />
            <Field label="Consultation Fee" type="number" value={form.consultation_fee} onChange={(e)=>upd("consultation_fee", e.target.value)} />
          </div>

          <Field label="Bio" value={form.bio} onChange={(e)=>upd("bio", e.target.value)} />

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Phone (E.164)" value={form.phone} onChange={(e)=>upd("phone", e.target.value)} />
            <Field label="Country" value={form.country} onChange={(e)=>upd("country", e.target.value)} />
            <Field label="State" value={form.state} onChange={(e)=>upd("state", e.target.value)} />
            <Field label="LGA" value={form.lga} onChange={(e)=>upd("lga", e.target.value)} />
          </div>
          <Field label="Address" value={form.address} onChange={(e)=>upd("address", e.target.value)} />

          <Field label="Specialties (comma-separated)" value={form.specialties_csv} onChange={(e)=>upd("specialties_csv", e.target.value)} placeholder="Cardiology, Neurology" />

          {err && <div className="text-red-600 text-sm">{err}</div>}
          {ok  && <div className="text-green-600 text-sm">{ok}</div>}
          <div className="flex gap-3">
            <button className="btn btn-primary" disabled={busy}>{busy ? "Submitting..." : "Register"}</button>
            <a className="btn btn-outline" href="/register">Back</a>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <input className="input" {...props}/>
    </div>
  );
}
function Select({ label, options, ...props }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      <select className="input" {...props}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
