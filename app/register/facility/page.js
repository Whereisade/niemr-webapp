"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { FACILITY_TYPES, CONTROLLED_BY } from "@/lib/constants";

export default function FacilityRegisterPage() {
  const [form, setForm] = useState({
    admin_email:"", admin_password:"", admin_first_name:"", admin_last_name:"", admin_phone:"",
    name:"", facility_type:"", controlled_by:"",
    country:"", state:"", lga:"", address:"",
    email:"", phone:"",
    registration_number:"", nhis_approved:false, nhis_number:"", total_bed_capacity:"",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function upd(k,v){ setForm(s=>({ ...s, [k]: v })); }
  function updbool(k,v){ setForm(s=>({ ...s, [k]: !!v })); }

  async function onSubmit(e) {
    e.preventDefault(); setBusy(true); setErr(""); setOk("");
    try {
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

      const data = await apiFetch("/facilities/register-admin/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setOk(`Facility created: ${data?.facility?.name || "Success"}. Admin user set.`);
      setForm({ ...form, admin_password:"" });
    } catch(e){ setErr(e.message || "Error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto card">
      <div className="card-body">
        <h2 className="h2">Hospital / Facility Registration</h2>
        <p className="muted text-sm">Creates a facility and the first Super Admin.</p>

        <form onSubmit={onSubmit} className="mt-4 grid gap-6">
          <section>
            <h3 className="font-semibold mb-2">Admin</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Admin Email" type="email" value={form.admin_email} onChange={(e)=>upd("admin_email", e.target.value)} required />
              <Field label="Admin Password" type="password" value={form.admin_password} onChange={(e)=>upd("admin_password", e.target.value)} required />
              <Field label="First name" value={form.admin_first_name} onChange={(e)=>upd("admin_first_name", e.target.value)} required />
              <Field label="Last name"  value={form.admin_last_name}  onChange={(e)=>upd("admin_last_name", e.target.value)} required />
              <Field label="Phone" value={form.admin_phone} onChange={(e)=>upd("admin_phone", e.target.value)} />
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Facility</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Name" value={form.name} onChange={(e)=>upd("name", e.target.value)} required />
              <Select label="Facility Type" value={form.facility_type} onChange={(e)=>upd("facility_type", e.target.value)} options={[{value:"",label:"--"}, ...FACILITY_TYPES]} />
              <Select label="Controlled By" value={form.controlled_by} onChange={(e)=>upd("controlled_by", e.target.value)} options={[{value:"",label:"--"}, ...CONTROLLED_BY]} />
              <Field label="Country" value={form.country} onChange={(e)=>upd("country", e.target.value)} required />
              <Field label="State" value={form.state} onChange={(e)=>upd("state", e.target.value)} />
              <Field label="LGA" value={form.lga} onChange={(e)=>upd("lga", e.target.value)} />
            </div>
            <Field label="Address" value={form.address} onChange={(e)=>upd("address", e.target.value)} />
          </section>

          <section>
            <h3 className="font-semibold mb-2">Contact & Regulatory</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Facility Email" type="email" value={form.email} onChange={(e)=>upd("email", e.target.value)} required />
              <Field label="Facility Phone" value={form.phone} onChange={(e)=>upd("phone", e.target.value)} required />
              <Field label="Registration Number" value={form.registration_number} onChange={(e)=>upd("registration_number", e.target.value)} />
              <Field label="Total Bed Capacity" type="number" value={form.total_bed_capacity} onChange={(e)=>upd("total_bed_capacity", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input id="nhis_approved" type="checkbox" checked={form.nhis_approved} onChange={(e)=>updbool("nhis_approved", e.target.checked)} />
              <label htmlFor="nhis_approved" className="text-sm">NHIS Approved?</label>
            </div>
            <div className="mt-2">
              <Field label="NHIS Number" value={form.nhis_number} onChange={(e)=>upd("nhis_number", e.target.value)} />
            </div>
          </section>

          {err && <div className="text-red-600 text-sm">{err}</div>}
          {ok  && <div className="text-green-600 text-sm">{ok}</div>}
          <div className="flex gap-3">
            <button className="btn btn-primary" disabled={busy}>{busy ? "Submitting..." : "Create Facility"}</button>
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
