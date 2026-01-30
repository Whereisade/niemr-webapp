"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import { outreachFetch } from "@/lib/outreachApi";
import { hasPerm, OUTREACH_PERMS } from "@/lib/outreachConfig";
import { ArrowLeft, Save, UserPlus } from "lucide-react";


function calcAgeYearsFromDob(dobStr) {
  if (!dobStr) return "";
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (!Number.isFinite(age) || age < 0) return "";
  return String(age);
}

export default function OutreachNewPatientPage() {
  const router = useRouter();
  const {
    loading: sessionLoading,
    error: sessionError,
    assignments,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    sites,
    permissions,
    switchEvent,
  } = useOutreachSession();

  const canCreate = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.PATIENTS_CREATE);

  const [fullName, setFullName] = useState("");
  const [sex, setSex] = useState("UNKNOWN");
  const [dob, setDob] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [phone, setPhone] = useState("");
  const [community, setCommunity] = useState("");
  const [address, setAddress] = useState("");
  const [siteId, setSiteId] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const siteOptions = useMemo(() => Array.isArray(sites) ? sites : [], [sites]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!selectedEventId) {
      setErr("Select an outreach event first.");
      return;
    }
    if (!fullName.trim()) {
      setErr("Full name is required.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        sex,
        phone: phone.trim(),
        community: community.trim(),
        address: address.trim(),
      };
      if (dob) payload.date_of_birth = dob;
      if (ageYears !== "") payload.age_years = Number(ageYears);
      if (siteId) payload.site = Number(siteId);

      const created = await outreachFetch("/outreach/patients/", {
        eventId: selectedEventId,
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push(`/outreach/patients/${created?.id}`);
    } catch (e2) {
      setErr(e2?.message || "Failed to create patient.");
    } finally {
      setBusy(false);
    }
  }

  if (sessionError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {sessionError}
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Permission denied</div>
        <p className="mt-1 text-sm text-slate-600">You don’t have permission to register outreach patients.</p>
        <div className="mt-4">
          <Link href="/outreach/patients" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to patients →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/outreach/patients"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New patient</h1>
      </div>

      <OutreachEventPicker
        loading={sessionLoading}
        assignments={assignments}
        isOutreachSuperAdmin={isOutreachSuperAdmin}
        selectedEventId={selectedEventId}
        selectedEvent={selectedEvent}
        onChange={switchEvent}
      />

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>
      ) : null}

      <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 text-blue-700">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">Patient biodata</div>
            <p className="text-sm text-slate-600">Basic info for outreach documentation.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Full name *</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. Amina Yusuf"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Date of birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => {
              const v = e.target.value;
              setDob(v);
              const a = calcAgeYearsFromDob(v);
              if (a !== "") setAgeYears(a);
            }}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Age (years)</label>
            <input
              type="number"
              min="0"
              max="130"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              disabled={Boolean(dob)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. 24"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. 080..."
            />
          </div>

          {siteOptions.length ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Site</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">(No site)</option>
                {siteOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Community</label>
            <input
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. Oke-Ira"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            Tip: outreach patient code is generated automatically.
          </div>
          <button
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save patient"}
          </button>
        </div>
      </form>
    </div>
  );
}
