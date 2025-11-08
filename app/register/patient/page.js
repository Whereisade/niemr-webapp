"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BLOOD_GROUPS, GENOTYPES, INSURANCE_STATUSES } from "@/lib/constants";

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
    <div className="max-w-2xl mx-auto card">
      <div className="card-body">
        <h2 className="h2">Patient Registration</h2>
        <p className="muted text-sm">Create a patient account.</p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Email" type="email" value={form.email} onChange={(e)=>upd("email", e.target.value)} required />
            <Field label="Password" type="password" value={form.password} onChange={(e)=>upd("password", e.target.value)} required />
            <Field label="First name" value={form.first_name} onChange={(e)=>upd("first_name", e.target.value)} required />
            <Field label="Last name" value={form.last_name} onChange={(e)=>upd("last_name", e.target.value)} required />
            <Field label="Date of Birth" type="date" value={form.dob} onChange={(e)=>upd("dob", e.target.value)} required />
            <Field label="Phone (E.164)" value={form.phone} onChange={(e)=>upd("phone", e.target.value)} />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Country" value={form.country} onChange={(e)=>upd("country", e.target.value)} />
            <Field label="State" value={form.state} onChange={(e)=>upd("state", e.target.value)} />
            <Field label="LGA" value={form.lga} onChange={(e)=>upd("lga", e.target.value)} />
          </div>
          <Field label="Address" value={form.address} onChange={(e)=>upd("address", e.target.value)} />

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Gender" value={form.gender} onChange={(e)=>upd("gender", e.target.value)} placeholder="Male/Female/Other" />
            <Select label="Blood Group" value={form.blood_group} onChange={(e)=>upd("blood_group", e.target.value)} options={[{value:"",label:"--"}, ...BLOOD_GROUPS]} />
            <Select label="Genotype" value={form.genotype} onChange={(e)=>upd("genotype", e.target.value)} options={[{value:"",label:"--"}, ...GENOTYPES]} />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Select label="Insurance Status" value={form.insurance_status} onChange={(e)=>upd("insurance_status", e.target.value)} options={INSURANCE_STATUSES} />
            {insured ? (
              <>
                <Select label="HMO" value={form.hmo_id} onChange={(e)=>upd("hmo_id", e.target.value)}
                        options={[{ value: "", label: "--" }, ...hmos.map(h=>({value: String(h.id), label: h.name}))]} />
                <Field label="HMO Plan" value={form.hmo_plan} onChange={(e)=>upd("hmo_plan", e.target.value)} />
              </>
            ) : <div className="hidden md:block" /> }
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}
          {ok  && <div className="text-green-600 text-sm">{ok}</div>}
          <div className="flex gap-3">
            <button className="btn btn-primary" disabled={busy}>{busy ? "Submitting..." : "Create account"}</button>
            <a className="btn btn-outline" href="/login">Back to Login</a>
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
