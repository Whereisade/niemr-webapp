"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { outreachFetch, normalizeList } from "@/lib/outreachApi";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import { OUTREACH_MODULES, hasPerm, OUTREACH_PERMS, isModuleEnabled } from "@/lib/outreachConfig";
import {
  ArrowLeft,
  RefreshCw,
  User,
  Activity,
  ClipboardList,
  FlaskConical,
  Pill,
  Syringe,
  Droplet,
  MessageCircleHeart,
  Baby,
  Save,
  Plus,
  CheckCircle2,
} from "lucide-react";

function fmtDT(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}
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



function Section({ title, icon: Icon, children, right }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 text-blue-700">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div>
            <div className="text-lg font-semibold text-slate-900">{title}</div>
          </div>
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${props.className || ""}`}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`min-h-[90px] w-full rounded-xl border border-slate-200 p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${props.className || ""}`}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${props.className || ""}`}
    />
  );
}

export default function OutreachPatientDetailPage() {
  const params = useParams();
  const patientId = params?.id;

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

  const modulesEnabled = selectedEvent?.modules_enabled || {};

  const [tab, setTab] = useState("overview");

  useEffect(() => {
    // Allow deep-linking to a specific tab via ?tab=vitals etc.
    try {
      const url = new URL(window.location.href);
      const t = url.searchParams.get("tab");
      if (t) setTab(String(t));
    } catch {}
  }, [patientId]);
  const [patient, setPatient] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // datasets
  const [vitals, setVitals] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [labCatalog, setLabCatalog] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [drugCatalog, setDrugCatalog] = useState([]);
  const [dispenses, setDispenses] = useState([]);
  const [immunizations, setImmunizations] = useState([]);
  const [bloodDonations, setBloodDonations] = useState([]);
  const [counseling, setCounseling] = useState([]);
  const [maternal, setMaternal] = useState([]);

  const canEditPatient = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.PATIENTS_EDIT);

  const tabs = useMemo(() => {
    const arr = [{ key: "overview", label: "Overview", icon: User }];
    if (isModuleEnabled(modulesEnabled, "vitals")) arr.push({ key: "vitals", label: "Vitals", icon: Activity });
    if (isModuleEnabled(modulesEnabled, "encounter")) arr.push({ key: "encounter", label: "Encounters", icon: ClipboardList });
    if (isModuleEnabled(modulesEnabled, "lab")) arr.push({ key: "lab", label: "Lab", icon: FlaskConical });
    if (isModuleEnabled(modulesEnabled, "pharmacy")) arr.push({ key: "pharmacy", label: "Pharmacy", icon: Pill });
    if (isModuleEnabled(modulesEnabled, "immunization")) arr.push({ key: "immunization", label: "Immunization", icon: Syringe });
    if (isModuleEnabled(modulesEnabled, "blood_donation")) arr.push({ key: "blood", label: "Blood Donation", icon: Droplet });
    if (isModuleEnabled(modulesEnabled, "counseling")) arr.push({ key: "counseling", label: "Counseling", icon: MessageCircleHeart });
    if (isModuleEnabled(modulesEnabled, "maternal")) arr.push({ key: "maternal", label: "Maternal", icon: Baby });
    return arr;
  }, [modulesEnabled]);

  async function loadPatient() {
    if (!selectedEventId || !patientId) return;
    setBusy(true);
    setErr("");
    try {
      const p = await outreachFetch(`/outreach/patients/${patientId}/`, { eventId: selectedEventId });
      setPatient(p);
    } catch (e) {
      setErr(e?.message || "Failed to load patient.");
      setPatient(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (selectedEventId && patientId) loadPatient();
  }, [selectedEventId, patientId]);

  // Load datasets per tab
  useEffect(() => {
    if (!selectedEventId || !patientId) return;

    async function loadTabData() {
      try {
        if (tab === "vitals") {
          const data = await outreachFetch(`/outreach/vitals/?patient_id=${patientId}`, { eventId: selectedEventId });
          setVitals(normalizeList(data));
        } else if (tab === "encounter") {
          const data = await outreachFetch(`/outreach/encounters/?patient_id=${patientId}`, { eventId: selectedEventId });
          setEncounters(normalizeList(data));
        } else if (tab === "lab") {
          const [cat, orders, results] = await Promise.all([
            outreachFetch("/outreach/labs/tests/", { eventId: selectedEventId }).catch(() => ({ results: [] })),
            outreachFetch(`/outreach/labs/orders/?patient_id=${patientId}`, { eventId: selectedEventId }).catch(() => ({ results: [] })),
            outreachFetch(`/outreach/labs/results/?patient_id=${patientId}`, { eventId: selectedEventId }).catch(() => ({ results: [] })),
          ]);
          setLabCatalog(normalizeList(cat));
          setLabOrders(normalizeList(orders));
          setLabResults(normalizeList(results));
        } else if (tab === "pharmacy") {
          const [cat, d] = await Promise.all([
            outreachFetch("/outreach/pharmacy/drugs/", { eventId: selectedEventId }).catch(() => ({ results: [] })),
            outreachFetch(`/outreach/pharmacy/dispenses/?patient_id=${patientId}`, { eventId: selectedEventId }).catch(() => ({ results: [] })),
          ]);
          setDrugCatalog(normalizeList(cat));
          setDispenses(normalizeList(d));
        } else if (tab === "immunization") {
          const data = await outreachFetch(`/outreach/immunizations/?patient_id=${patientId}`, { eventId: selectedEventId });
          setImmunizations(normalizeList(data));
        } else if (tab === "blood") {
          const data = await outreachFetch(`/outreach/blood-donations/?patient_id=${patientId}`, { eventId: selectedEventId });
          setBloodDonations(normalizeList(data));
        } else if (tab === "counseling") {
          const data = await outreachFetch(`/outreach/counseling/?patient_id=${patientId}`, { eventId: selectedEventId });
          setCounseling(normalizeList(data));
        } else if (tab === "maternal") {
          const data = await outreachFetch(`/outreach/maternal/?patient_id=${patientId}`, { eventId: selectedEventId });
          setMaternal(normalizeList(data));
        }
      } catch (e) {
        // keep page usable; show a small error banner per tab if needed
        console.error(e);
      }
    }

    loadTabData();
  }, [tab, selectedEventId, patientId]);

  const siteOptions = useMemo(() => Array.isArray(sites) ? sites : [], [sites]);

  // Quick permissions per module
  const canVitals = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.VITALS_CREATE);
  const canEncounter = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.ENCOUNTER_CREATE);
  const canLabOrder = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.LAB_ORDER_CREATE);
  const canLabResult = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.LAB_RESULT_CREATE);
  const canDispense = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.PHARMACY_DISPENSE_CREATE);
  const canImmunize = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.IMMUNIZATION_CREATE);
  const canBlood = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.BLOOD_CREATE);
  const canCounsel = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.COUNSELING_CREATE);
  const canMaternal = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.MATERNAL_CREATE);

  // ===== Overview edit form =====
  const [edit, setEdit] = useState(null); // local editable copy
  useEffect(() => {
    if (patient) {
      setEdit({
        full_name: patient.full_name || "",
        sex: patient.sex || "UNKNOWN",
        date_of_birth: patient.date_of_birth || "",
        age_years: patient.age_years ?? "",
        phone: patient.phone || "",
        community: patient.community || "",
        address: patient.address || "",
        site: patient.site?.id || patient.site || "",
      });
    }
  }, [patient]);

  async function savePatient() {
    if (!canEditPatient || !edit) return;
    setBusy(true);
    setErr("");
    try {
      const payload = {
        full_name: edit.full_name?.trim(),
        sex: edit.sex,
        phone: edit.phone?.trim(),
        community: edit.community?.trim(),
        address: edit.address?.trim(),
      };
      if (edit.date_of_birth) payload.date_of_birth = edit.date_of_birth;
      if (edit.age_years !== "") payload.age_years = Number(edit.age_years);
      if (edit.site) payload.site = Number(edit.site);
      const updated = await outreachFetch(`/outreach/patients/${patientId}/`, {
        eventId: selectedEventId,
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setPatient(updated);
    } catch (e) {
      setErr(e?.message || "Failed to update patient.");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/outreach/patients"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <div className="text-xs font-semibold text-slate-500">Outreach patient</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {patient?.full_name || "Patient"}
            </h1>
            <div className="mt-1 text-sm text-slate-600">
              {patient?.patient_code ? `Code: ${patient.patient_code}` : null}
              {patient?.sex ? ` • ${patient.sex}` : ""}
              {patient?.age_years != null ? ` • ${patient.age_years}y` : ""}
            </div>
          </div>
        </div>

        <button
          onClick={loadPatient}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          Refresh
        </button>
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

      {!selectedEventId ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-slate-900">Select an outreach event</div>
          <p className="mt-1 text-sm text-slate-600">You need an outreach context to access patient records.</p>
        </div>
      ) : null}

      {selectedEventId ? (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm ring-1 transition ${
                    active
                      ? "bg-blue-600 text-white ring-blue-600"
                      : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "overview" ? (
            <Section
              title="Patient overview"
              icon={User}
              right={
                canEditPatient ? (
                  <button
                    onClick={savePatient}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                ) : null
              }
            >
              {!patient ? (
                <div className="text-sm text-slate-600">Loading patient…</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name">
                    <TextInput
                      value={edit?.full_name || ""}
                      onChange={(e) => setEdit((p) => ({ ...p, full_name: e.target.value }))}
                      disabled={!canEditPatient || Boolean(edit?.date_of_birth)}
                    />
                  </Field>

                  <Field label="Sex">
                    <Select
                      value={edit?.sex || "UNKNOWN"}
                      onChange={(e) => setEdit((p) => ({ ...p, sex: e.target.value }))}
                      disabled={!canEditPatient}
                    >
                      <option value="UNKNOWN">Unknown</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </Select>
                  </Field>

                  <Field label="Date of birth">
                    <TextInput
                      type="date"
                      value={edit?.date_of_birth || ""}
                      onChange={(e) => {
                      const v = e.target.value;
                      const a = calcAgeYearsFromDob(v);
                      setEdit((p) => ({ ...p, date_of_birth: v, age_years: a !== "" ? a : p.age_years }));
                    }}
                      disabled={!canEditPatient}
                    />
                  </Field>

                  <Field label="Age (years)">
                    <TextInput
                      type="number"
                      min="0"
                      max="130"
                      value={edit?.age_years ?? ""}
                      onChange={(e) => setEdit((p) => ({ ...p, age_years: e.target.value }))}
                      disabled={!canEditPatient || Boolean(edit?.date_of_birth)}
                    />
                  </Field>

                  <Field label="Phone">
                    <TextInput
                      value={edit?.phone || ""}
                      onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))}
                      disabled={!canEditPatient}
                    />
                  </Field>

                  {siteOptions.length ? (
                    <Field label="Site">
                      <Select
                        value={edit?.site || ""}
                        onChange={(e) => setEdit((p) => ({ ...p, site: e.target.value }))}
                        disabled={!canEditPatient}
                      >
                        <option value="">(No site)</option>
                        {siteOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : null}

                  <Field label="Community">
                    <TextInput
                      value={edit?.community || ""}
                      onChange={(e) => setEdit((p) => ({ ...p, community: e.target.value }))}
                      disabled={!canEditPatient}
                    />
                  </Field>

                  <Field label="Address">
                    <TextInput
                      value={edit?.address || ""}
                      onChange={(e) => setEdit((p) => ({ ...p, address: e.target.value }))}
                      disabled={!canEditPatient}
                    />
                  </Field>

                  <div className="md:col-span-2 text-xs text-slate-500">
                    Created: {fmtDT(patient.created_at)} • Updated: {fmtDT(patient.updated_at)}
                  </div>
                </div>
              )}
            </Section>
          ) : null}

          {tab === "vitals" ? (
            <VitalsTab
              patientId={patientId}
              eventId={selectedEventId}
              vitals={vitals}
              setVitals={setVitals}
              canCreate={canVitals}
            />
          ) : null}

          {tab === "encounter" ? (
            <EncounterTab
              patientId={patientId}
              eventId={selectedEventId}
              encounters={encounters}
              setEncounters={setEncounters}
              canCreate={canEncounter}
            />
          ) : null}

          {tab === "lab" ? (
            <LabTab
              patientId={patientId}
              eventId={selectedEventId}
              labCatalog={labCatalog}
              labOrders={labOrders}
              setLabOrders={setLabOrders}
              labResults={labResults}
              setLabResults={setLabResults}
              canOrder={canLabOrder}
              canResult={canLabResult}
            />
          ) : null}

          {tab === "pharmacy" ? (
            <PharmacyTab
              patientId={patientId}
              eventId={selectedEventId}
              drugCatalog={drugCatalog}
              dispenses={dispenses}
              setDispenses={setDispenses}
              canCreate={canDispense}
            />
          ) : null}

          {tab === "immunization" ? (
            <ImmunizationTab
              patientId={patientId}
              eventId={selectedEventId}
              rows={immunizations}
              setRows={setImmunizations}
              canCreate={canImmunize}
              canManageCatalog={isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.IMMUNIZATION_EDIT)}
            />
          ) : null}

          {tab === "blood" ? (
            <BloodDonationTab
              patientId={patientId}
              eventId={selectedEventId}
              rows={bloodDonations}
              setRows={setBloodDonations}
              canCreate={canBlood}
            />
          ) : null}

          {tab === "counseling" ? (
            <CounselingTab
              patientId={patientId}
              eventId={selectedEventId}
              rows={counseling}
              setRows={setCounseling}
              canCreate={canCounsel}
            />
          ) : null}

          {tab === "maternal" ? (
            <MaternalTab
              patientId={patientId}
              eventId={selectedEventId}
              rows={maternal}
              setRows={setMaternal}
              canCreate={canMaternal}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function VitalsTab({ patientId, eventId, vitals, setVitals, canCreate }) {
  const [form, setForm] = useState({
    temp_c: "",
    bp_sys: "",
    bp_dia: "",
    pulse: "",
    weight_kg: "",
    height_cm: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const bmiPreview = useMemo(() => {
    const w = parseFloat(form.weight_kg);
    const h = parseFloat(form.height_cm);
    if (!w || !h) return "";
    const m = h / 100;
    const v = w / (m * m);
    if (!isFinite(v)) return "";
    return v.toFixed(1);
  }, [form.weight_kg, form.height_cm]);

  async function submit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setErr("");
    setBusy(true);
    try {
      const payload = { patient: Number(patientId) };
      const numFields = ["temp_c", "bp_sys", "bp_dia", "pulse", "weight_kg", "height_cm"];
      numFields.forEach((k) => {
        const v = form[k];
        if (v !== "" && v != null) payload[k] = Number(v);
      });

      const created = await outreachFetch("/outreach/vitals/", {
        eventId,
        method: "POST",
        body: JSON.stringify(payload),
      });

      setVitals([created, ...(vitals || [])]);
      setForm({ temp_c: "", bp_sys: "", bp_dia: "", pulse: "", weight_kg: "", height_cm: "" });
    } catch (e2) {
      setErr(e2?.message || "Failed to save vitals.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Record vitals" icon={Activity}>
        {!canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            You don’t have permission to record vitals.
          </div>
        ) : null}
        {err ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div>
        ) : null}

        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Temperature (°C)">
              <TextInput value={form.temp_c} onChange={(e) => setForm((p) => ({ ...p, temp_c: e.target.value }))} type="number" step="0.1" />
            </Field>
            <Field label="Pulse (bpm)">
              <TextInput value={form.pulse} onChange={(e) => setForm((p) => ({ ...p, pulse: e.target.value }))} type="number" />
            </Field>
            <Field label="BP Systolic">
              <TextInput value={form.bp_sys} onChange={(e) => setForm((p) => ({ ...p, bp_sys: e.target.value }))} type="number" />
            </Field>
            <Field label="BP Diastolic">
              <TextInput value={form.bp_dia} onChange={(e) => setForm((p) => ({ ...p, bp_dia: e.target.value }))} type="number" />
            </Field>
            <Field label="Weight (kg)">
              <TextInput value={form.weight_kg} onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))} type="number" step="0.1" />
            </Field>
            <Field label="Height (cm)">
              <TextInput value={form.height_cm} onChange={(e) => setForm((p) => ({ ...p, height_cm: e.target.value }))} type="number" />
            </Field>
          </div>

          <div className="text-xs text-slate-600">
            BMI (preview): <span className="font-semibold text-slate-900">{bmiPreview || "—"}</span>
          </div>

          <button
            disabled={busy || !canCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save vitals"}
          </button>
        </form>
      </Section>

      <Section title="Vitals history" icon={Activity} right={<div className="text-sm text-slate-600">{(vitals || []).length} record(s)</div>}>
        {(vitals || []).length ? (
          <div className="space-y-3">
            {vitals.map((v) => (
              <div key={v.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{fmtDT(v.recorded_at)}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700 sm:grid-cols-3">
                  <span>Temp: <b>{v.temp_c ?? "—"}</b></span>
                  <span>Pulse: <b>{v.pulse ?? "—"}</b></span>
                  <span>BP: <b>{v.bp_sys ?? "—"}/{v.bp_dia ?? "—"}</b></span>
                  <span>Wt: <b>{v.weight_kg ?? "—"}</b></span>
                  <span>Ht: <b>{v.height_cm ?? "—"}</b></span>
                  <span>BMI: <b>{v.bmi ?? "—"}</b></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No vitals recorded yet.</div>
        )}
      </Section>
    </div>
  );
}

function EncounterTab({ patientId, eventId, encounters, setEncounters, canCreate }) {
  const [form, setForm] = useState({
    complaint: "",
    notes: "",
    diagnosis_tags: "", // comma-separated
    plan: "",
    referral_note: "",
  });
  const [soapFile, setSoapFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setErr("");
    setBusy(true);
    try {
      const tags = String(form.diagnosis_tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      let body = null;
      let init = { eventId, method: "POST" };

      if (soapFile) {
        const fd = new FormData();
        fd.append("patient", String(patientId));
        fd.append("complaint", form.complaint || "");
        fd.append("notes", form.notes || "");
        fd.append("plan", form.plan || "");
        fd.append("referral_note", form.referral_note || "");
        fd.append("diagnosis_tags", JSON.stringify(tags));
        fd.append("soap_note_attachment", soapFile);
        body = fd;
        init.body = body;
      } else {
        const payload = {
          patient: Number(patientId),
          complaint: form.complaint || "",
          notes: form.notes || "",
          plan: form.plan || "",
          referral_note: form.referral_note || "",
          diagnosis_tags: tags,
        };
        init.body = JSON.stringify(payload);
      }

      const created = await outreachFetch("/outreach/encounters/", init);
      setEncounters([created, ...(encounters || [])]);
      setForm({ complaint: "", notes: "", diagnosis_tags: "", plan: "", referral_note: "" });
      setSoapFile(null);
    } catch (e2) {
      setErr(e2?.message || "Failed to save encounter.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="New encounter" icon={ClipboardList}>
        {!canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            You don’t have permission to create encounters.
          </div>
        ) : null}
        {err ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div>
        ) : null}

        <form onSubmit={submit} className="grid gap-3">
          <Field label="Complaint">
            <TextArea value={form.complaint} onChange={(e) => setForm((p) => ({ ...p, complaint: e.target.value }))} />
          </Field>

          <Field label="Clinical notes">
            <TextArea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </Field>

          <Field label="Diagnosis tags (comma-separated)">
            <TextInput value={form.diagnosis_tags} onChange={(e) => setForm((p) => ({ ...p, diagnosis_tags: e.target.value }))} />
          </Field>

          <Field label="Plan">
            <TextArea value={form.plan} onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))} />
          </Field>

          <Field label="Referral note (optional)">
            <TextArea value={form.referral_note} onChange={(e) => setForm((p) => ({ ...p, referral_note: e.target.value }))} />
          </Field>

          <Field label="SOAP note attachment (optional)">
            <input
              type="file"
              onChange={(e) => setSoapFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800 hover:file:bg-slate-200"
            />
            {soapFile ? <div className="mt-1 text-xs text-slate-600">Selected: {soapFile.name}</div> : null}
          </Field>

          <button
            disabled={busy || !canCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save encounter"}
          </button>
        </form>
      </Section>

      <Section
        title="Encounter history"
        icon={ClipboardList}
        right={<div className="text-sm text-slate-600">{(encounters || []).length} record(s)</div>}
      >
        {(encounters || []).length ? (
          <div className="space-y-3">
            {encounters.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelected(e)}
                className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{fmtDT(e.recorded_at)}</div>
                  {e.soap_note_attachment ? (
                    <span className="text-xs font-medium text-emerald-700">Attachment</span>
                  ) : null}
                </div>
                {e.complaint ? <div className="mt-2 text-sm text-slate-900"><b>Complaint:</b> {e.complaint}</div> : null}
                {e.plan ? <div className="mt-2 text-sm text-slate-700"><b>Plan:</b> {e.plan}</div> : null}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No encounters yet.</div>
        )}

        {selected ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900">Encounter details</div>
                  <div className="text-sm text-slate-600">{fmtDT(selected.recorded_at)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {selected.complaint ? <div className="text-sm"><b>Complaint:</b> {selected.complaint}</div> : null}
                {selected.notes ? <div className="text-sm"><b>Notes:</b> {selected.notes}</div> : null}
                {Array.isArray(selected.diagnosis_tags) && selected.diagnosis_tags.length ? (
                  <div className="text-sm">
                    <b>Tags:</b>{" "}
                    <span className="text-slate-700">{selected.diagnosis_tags.join(", ")}</span>
                  </div>
                ) : null}
                {selected.plan ? <div className="text-sm"><b>Plan:</b> {selected.plan}</div> : null}
                {selected.referral_note ? <div className="text-sm"><b>Referral note:</b> {selected.referral_note}</div> : null}

                {selected.soap_note_attachment ? (
                  <div className="pt-2">
                    <a
                      href={selected.soap_note_attachment}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      View attachment
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Section>
    </div>
  );
}

function LabTab({
  patientId,
  eventId,
  labCatalog,
  labOrders,
  setLabOrders,
  labResults,
  setLabResults,
  canOrder,
  canResult,
}) {
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const tests = useMemo(() => (labCatalog || []).filter((t) => t?.is_active !== false), [labCatalog]);

  async function createOrder(e) {
    e.preventDefault();
    if (!canOrder) return;
    setErr("");
    if (!selectedTestIds.length) {
      setErr("Select at least one test.");
      return;
    }
    setBusy(true);
    try {
      const payload = { patient_id: Number(patientId), test_ids: selectedTestIds.map(Number), notes: notes || "" };
      const created = await outreachFetch("/outreach/labs/orders/", {
        eventId,
        method: "POST",
        body: JSON.stringify(payload),
      });
      setLabOrders([created, ...(labOrders || [])]);
      setSelectedTestIds([]);
      setNotes("");
    } catch (e2) {
      setErr(e2?.message || "Failed to create lab order.");
    } finally {
      setBusy(false);
    }
  }

  async function markCollected(orderId) {
    setBusy(true);
    try {
      const updated = await outreachFetch(`/outreach/labs/orders/${orderId}/mark-collected/`, { eventId, method: "POST" });
      setLabOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (e) {
      setErr(e?.message || "Failed to mark collected.");
    } finally {
      setBusy(false);
    }
  }

  // Result entry
  const [resultOrderId, setResultOrderId] = useState("");
  const [resultMap, setResultMap] = useState({}); // itemId -> value
  const [resultNotes, setResultNotes] = useState("");
  const [resultAttachment, setResultAttachment] = useState(null);

  const orderOptions = useMemo(() => (labOrders || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0)), [labOrders]);
  const selectedOrder = useMemo(() => orderOptions.find((o) => String(o.id) === String(resultOrderId)), [orderOptions, resultOrderId]);

  async function submitResults(e) {
    e.preventDefault();
    if (!canResult) return;
    if (!selectedOrder) {
      setErr("Select a lab order.");
      return;
    }
    const items = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];
    if (!items.length && !resultAttachment) {
      setErr("This order has no items.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const createdResults = [];

      // Typed results (per item)
      for (const item of items) {
        const val = resultMap[item.id];
        if (val == null || String(val).trim() === "") continue;
        const payload = {
          lab_order: selectedOrder.id,
          item: item.id,
          test_name: item.test_name || item.test?.name || "",
          unit: item.test?.unit || "",
          result_value: String(val),
          notes: resultNotes || "",
        };
        const created = await outreachFetch("/outreach/labs/results/", { eventId, method: "POST", body: JSON.stringify(payload) });
        createdResults.push(created);
      }

      // Attachment-only (order-level)
      if (resultAttachment) {
        const fd = new FormData();
        fd.append("lab_order", String(selectedOrder.id));
        fd.append("test_name", "Lab report attachment");
        fd.append("notes", resultNotes || "");
        fd.append("result_attachment", resultAttachment);
        const created = await outreachFetch("/outreach/labs/results/", { eventId, method: "POST", body: fd });
        createdResults.push(created);
      }

      if (!createdResults.length) {
        setErr("Enter at least one result value or attach a result file.");
      } else {
        setLabResults([...(createdResults || []), ...(labResults || [])]);
        setResultMap({});
        setResultNotes("");
        setResultOrderId("");
        setResultAttachment(null);
      }
    } catch (e2) {
      setErr(e2?.message || "Failed to save result.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Create lab order" icon={FlaskConical}>
          {!canOrder ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              You don’t have permission to create lab orders.
            </div>
          ) : null}
          {err ? (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div>
          ) : null}

          <form onSubmit={createOrder} className="grid gap-3">
            <Field label="Select tests">
              <div className="grid gap-2 sm:grid-cols-2">
                {tests.map((t) => {
                  const checked = selectedTestIds.includes(t.id);
                  return (
                    <label key={t.id} className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setSelectedTestIds((prev) => {
                            const set = new Set(prev);
                            if (on) set.add(t.id);
                            else set.delete(t.id);
                            return Array.from(set);
                          });
                        }}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{t.name}</div>
                        {(t.unit || t.ref_low || t.ref_high) ? (
                          <div className="text-xs text-slate-600">
                            {[t.unit, (t.ref_low || t.ref_high) ? `Ref: ${[t.ref_low, t.ref_high].filter(Boolean).join("–")}` : ""].filter(Boolean).join(" • ")}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label="Notes (optional)">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>

            <button
              disabled={busy || !canOrder}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {busy ? "Creating…" : "Create order"}
            </button>
          </form>
        </Section>

        <Section title="Enter lab results" icon={CheckCircle2}>
          {!canResult ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              You don’t have permission to enter lab results.
            </div>
          ) : null}

          {err ? (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div>
          ) : null}

          <form onSubmit={submitResults} className="grid gap-3">
            <Field label="Lab order">
              <Select value={resultOrderId} onChange={(e) => setResultOrderId(e.target.value)}>
                <option value="">Select an order…</option>
                {orderOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} • {o.status}
                  </option>
                ))}
              </Select>
            </Field>

            {selectedOrder ? (
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-600">Items (type results or attach file below)</div>
                <div className="mt-2 grid gap-2">
                  {(selectedOrder.items || []).map((it) => (
                    <div key={it.id} className="grid gap-2 sm:grid-cols-2">
                      <div className="text-sm font-medium text-slate-900">{it.test_name}</div>
                      <TextInput
                        placeholder="Result value"
                        value={resultMap[it.id] || ""}
                        onChange={(e) => setResultMap((p) => ({ ...p, [it.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <Field label="Result attachment (optional)">
              <input
                type="file"
                onChange={(e) => setResultAttachment(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800 hover:file:bg-slate-200"
              />
              {resultAttachment ? <div className="mt-1 text-xs text-slate-600">Selected: {resultAttachment.name}</div> : null}
            </Field>

            <Field label="Notes (optional)">
              <TextArea value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} />
            </Field>

            <button
              disabled={busy || !canResult}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {busy ? "Saving…" : "Save results"}
            </button>
          </form>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Lab orders" icon={FlaskConical} right={<div className="text-sm text-slate-600">{(labOrders || []).length} order(s)</div>}>
          {(labOrders || []).length ? (
            <div className="space-y-3">
              {labOrders.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">#{o.id}</div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {o.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">Ordered: {fmtDT(o.ordered_at)}</div>
                  {(o.items || []).length ? (
                    <div className="mt-2 text-sm text-slate-700">
                      {(o.items || []).map((it) => it.test_name).filter(Boolean).join(", ")}
                    </div>
                  ) : null}

                  {o.status === "ORDERED" && canOrder ? (
                    <button
                      onClick={() => markCollected(o.id)}
                      disabled={busy}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark collected
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No lab orders yet.</div>
          )}
        </Section>

        <Section title="Lab results" icon={CheckCircle2} right={<div className="text-sm text-slate-600">{(labResults || []).length} result(s)</div>}>
          {(labResults || []).length ? (
            <div className="space-y-3">
              {labResults.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{r.test_name || "Result"}</div>
                    <span className="text-xs text-slate-500">{fmtDT(r.recorded_at)}</span>
                  </div>

                  {r.result_value ? (
                    <div className="mt-2 text-sm text-slate-700">
                      Value: <b>{r.result_value}</b> {r.unit || ""}
                    </div>
                  ) : r.result_attachment ? (
                    <div className="mt-2 text-sm text-slate-700">
                      Result: <b>Attachment uploaded</b>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-700">Result: <b>—</b></div>
                  )}

                  {r.result_attachment ? (
                    <div className="mt-2">
                      <a href={r.result_attachment} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 underline">
                        View attachment
                      </a>
                    </div>
                  ) : null}

                  {r.notes ? <div className="mt-2 text-sm text-slate-600">{r.notes}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No lab results yet.</div>
          )}
        </Section>
      </div>
    </div>
  );
}

function PharmacyTab({ patientId, eventId, drugCatalog, dispenses, setDispenses, canCreate }) {
  const [drugId, setDrugId] = useState("");
  const [drugName, setDrugName] = useState("");
  const [strength, setStrength] = useState("");
  const [quantity, setQuantity] = useState("");
  const [instruction, setInstruction] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const drugs = useMemo(() => (drugCatalog || []).filter((d) => d?.is_active !== false), [drugCatalog]);

  function onPickDrug(id) {
    setDrugId(id);
    const d = drugs.find((x) => String(x.id) === String(id));
    if (d) {
      setDrugName(d.name || "");
      setStrength(d.strength || "");
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setErr("");
    if (!quantity) {
      setErr("Quantity is required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        patient_id: Number(patientId),
        quantity: Number(quantity),
        instruction: instruction || "",
      };
      if (drugId) payload.drug_id = Number(drugId);
      if (!drugId) payload.drug_name = drugName || "";
      if (strength) payload.strength = strength;

      const created = await outreachFetch("/outreach/pharmacy/dispenses/", { eventId, method: "POST", body: JSON.stringify(payload) });
      setDispenses([created, ...(dispenses || [])]);
      setDrugId("");
      setDrugName("");
      setStrength("");
      setQuantity("");
      setInstruction("");
    } catch (e2) {
      setErr(e2?.message || "Failed to save dispense.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Dispense log" icon={Pill}>
        {!canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            You don’t have permission to log dispenses.
          </div>
        ) : null}
        {err ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div>
        ) : null}

        <form onSubmit={submit} className="grid gap-3">
          <Field label="Pick from catalog (optional)">
            <Select value={drugId} onChange={(e) => onPickDrug(e.target.value)}>
              <option value="">Manual entry…</option>
              {drugs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.strength ? `(${d.strength})` : ""}
                </option>
              ))}
            </Select>
          </Field>

          {!drugId ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Drug name">
                <TextInput value={drugName} onChange={(e) => setDrugName(e.target.value)} placeholder="e.g. Paracetamol" />
              </Field>
              <Field label="Strength">
                <TextInput value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 500mg" />
              </Field>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Strength">
              <TextInput value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 500mg" />
            </Field>
            <Field label="Quantity *">
              <TextInput value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" step="0.01" />
            </Field>
          </div>

          <Field label="Instruction (optional)">
            <TextArea value={instruction} onChange={(e) => setInstruction(e.target.value)} />
          </Field>

          <button
            disabled={busy || !canCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save dispense"}
          </button>
        </form>
      </Section>

      <Section title="Dispense history" icon={Pill} right={<div className="text-sm text-slate-600">{(dispenses || []).length} record(s)</div>}>
        {(dispenses || []).length ? (
          <div className="space-y-3">
            {dispenses.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{d.drug_name || d.drug?.name || "Drug"}</div>
                  <span className="text-xs text-slate-500">{fmtDT(d.dispensed_at || d.created_at)}</span>
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {d.strength ? `${d.strength} • ` : ""}Qty: <b>{d.quantity}</b>
                </div>
                {d.instruction ? <div className="mt-2 text-sm text-slate-600">{d.instruction}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No dispense records yet.</div>
        )}
      </Section>
    </div>
  );
}


function ImmunizationTab({ patientId, eventId, rows, setRows, canCreate, canManageCatalog }) {
  const [vaccines, setVaccines] = useState([]);
  const [loadingVaccines, setLoadingVaccines] = useState(false);

  const [form, setForm] = useState({
    vaccine_name: "",
    dose_number: "",
    batch_number: "",
    route: "",
    administered_at: "",
    notes: "",
  });
  const [addCatalogOpen, setAddCatalogOpen] = useState(false);
  const [newVaccine, setNewVaccine] = useState({ name: "", manufacturer: "", code: "" });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadVaccines() {
    if (!eventId) return;
    setLoadingVaccines(true);
    try {
      const data = await outreachFetch("/outreach/immunization-vaccines/", { eventId });
      setVaccines(normalizeList(data));
    } catch {
      // keep silent; immunization can still be recorded manually
      setVaccines([]);
    } finally {
      setLoadingVaccines(false);
    }
  }

  useEffect(() => {
    loadVaccines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function onPickVaccine(name) {
    setForm((p) => ({ ...p, vaccine_name: name }));
  }

  async function addToCatalog(e) {
    e.preventDefault();
    if (!canManageCatalog) return;
    const name = (newVaccine.name || "").trim();
    if (!name) return;
    setErr("");
    try {
      const created = await outreachFetch("/outreach/immunization-vaccines/", {
        eventId,
        method: "POST",
        body: JSON.stringify({
          name,
          manufacturer: (newVaccine.manufacturer || "").trim(),
          code: (newVaccine.code || "").trim(),
        }),
      });
      const list = [created, ...(vaccines || [])].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
      setVaccines(list);
      setNewVaccine({ name: "", manufacturer: "", code: "" });
      setAddCatalogOpen(false);
      setForm((p) => ({ ...p, vaccine_name: created?.name || name }));
    } catch (e2) {
      setErr(e2?.message || "Failed to add vaccine to catalog.");
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!canCreate) return;
    if (!form.vaccine_name.trim()) {
      setErr("Vaccine is required.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const payload = {
        patient: Number(patientId),
        vaccine_name: form.vaccine_name.trim(),
        route: form.route || "",
        batch_number: form.batch_number || "",
        notes: form.notes || "",
      };
      if (form.dose_number !== "") payload.dose_number = Number(form.dose_number);
      if (form.administered_at) payload.administered_at = form.administered_at;

      const created = await outreachFetch("/outreach/immunizations/", { eventId, method: "POST", body: JSON.stringify(payload) });
      setRows([created, ...(rows || [])]);
      setForm({ vaccine_name: "", dose_number: "", batch_number: "", route: "", administered_at: "", notes: "" });
    } catch (e2) {
      setErr(e2?.message || "Failed to save immunization.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section
        title="Record immunization"
        icon={Syringe}
        right={
          canManageCatalog ? (
            <button
              type="button"
              onClick={() => setAddCatalogOpen((v) => !v)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Plus className="mr-1 inline h-4 w-4" />
              {addCatalogOpen ? "Close" : "Add vaccine"}
            </button>
          ) : null
        }
      >
        {!canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            You don’t have permission to record immunizations.
          </div>
        ) : null}

        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        {addCatalogOpen ? (
          <form onSubmit={addToCatalog} className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-sm font-semibold text-slate-900">Add vaccine to this outreach catalog</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vaccine name *">
                <TextInput value={newVaccine.name} onChange={(e) => setNewVaccine((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Manufacturer (optional)">
                <TextInput value={newVaccine.manufacturer} onChange={(e) => setNewVaccine((p) => ({ ...p, manufacturer: e.target.value }))} />
              </Field>
            </div>
            <Field label="Code (optional)">
              <TextInput value={newVaccine.code} onChange={(e) => setNewVaccine((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. BCG, OPV" />
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Save className="h-4 w-4" />
                Add
              </button>
              <button
                type="button"
                onClick={loadVaccines}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingVaccines ? "animate-spin" : ""}`} />
                Refresh catalog
              </button>
            </div>
          </form>
        ) : null}

        <form onSubmit={submit} className="grid gap-3">
          <Field label="Pick from vaccine catalog">
            <Select value={form.vaccine_name} onChange={(e) => onPickVaccine(e.target.value)}>
              <option value="">{loadingVaccines ? "Loading…" : "Select vaccine…"}</option>
              {(vaccines || []).map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}{v.manufacturer ? ` — ${v.manufacturer}` : ""}
                </option>
              ))}
            </Select>
            <div className="mt-2 text-xs text-slate-500">
              Tip: if it’s not in the list, use “Add vaccine” to add it for this outreach.
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dose number">
              <TextInput type="number" value={form.dose_number} onChange={(e) => setForm((p) => ({ ...p, dose_number: e.target.value }))} />
            </Field>
            <Field label="Date administered (optional)">
              <TextInput type="date" value={form.administered_at} onChange={(e) => setForm((p) => ({ ...p, administered_at: e.target.value }))} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Batch number (optional)">
              <TextInput value={form.batch_number} onChange={(e) => setForm((p) => ({ ...p, batch_number: e.target.value }))} />
            </Field>
            <Field label="Route (optional)">
              <TextInput value={form.route} onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))} placeholder="e.g. IM, SC, Oral" />
            </Field>
          </div>

          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </Field>

          <button
            disabled={busy || !canCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      </Section>

      <Section title="Immunization history" icon={Syringe} right={<div className="text-sm text-slate-600">{(rows || []).length} record(s)</div>}>
        {(rows || []).length ? (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{r.vaccine_name}</div>
                  <span className="text-xs text-slate-500">{fmtDT(r.administered_at || r.created_at)}</span>
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {r.dose_number != null ? `Dose: ${r.dose_number}` : null}
                  {r.batch_number ? ` • Batch: ${r.batch_number}` : null}
                  {r.route ? ` • Route: ${r.route}` : null}
                </div>
                {r.notes ? <div className="mt-2 text-sm text-slate-600">{r.notes}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No immunization records yet.</div>
        )}
      </Section>
    </div>
  );
}



function BloodDonationTab({ patientId, eventId, rows, setRows, canCreate }) {
  const [form, setForm] = useState({
    eligibility_status: "ELIGIBLE",
    outcome: "COMPLETED",
    deferral_reason: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setErr("");
    setBusy(true);
    try {
      const payload = {
        patient: Number(patientId),
        eligibility_status: form.eligibility_status,
        outcome: form.outcome,
        deferral_reason: form.eligibility_status === "NOT_ELIGIBLE" || form.outcome === "DEFERRED" ? (form.deferral_reason || "") : "",
        notes: form.notes || "",
      };
      const created = await outreachFetch("/outreach/blood-donations/", { eventId, method: "POST", body: JSON.stringify(payload) });
      setRows([created, ...(rows || [])]);
      setForm({ eligibility_status: "ELIGIBLE", outcome: "COMPLETED", deferral_reason: "", notes: "" });
    } catch (e2) {
      setErr(e2?.message || "Failed to save record.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Blood donation record" icon={Droplet}>
        {!canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            You don’t have permission to record blood donation.
          </div>
        ) : null}
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Eligibility status">
              <Select value={form.eligibility_status} onChange={(e) => setForm((p) => ({ ...p, eligibility_status: e.target.value }))}>
                <option value="ELIGIBLE">Eligible</option>
                <option value="NOT_ELIGIBLE">Not eligible</option>
              </Select>
            </Field>
            <Field label="Outcome">
              <Select value={form.outcome} onChange={(e) => setForm((p) => ({ ...p, outcome: e.target.value }))}>
                <option value="COMPLETED">Completed</option>
                <option value="DEFERRED">Deferred</option>
              </Select>
            </Field>
          </div>

          {(form.eligibility_status === "NOT_ELIGIBLE" || form.outcome === "DEFERRED") ? (
            <Field label="Deferral reason">
              <TextArea value={form.deferral_reason} onChange={(e) => setForm((p) => ({ ...p, deferral_reason: e.target.value }))} placeholder="Why deferred / not eligible?" />
            </Field>
          ) : null}

          <Field label="Notes (optional)">
            <TextArea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </Field>

          <button
            disabled={busy || !canCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      </Section>

      <Section title="Donation history" icon={Droplet} right={<div className="text-sm text-slate-600">{(rows || []).length} record(s)</div>}>
        {(rows || []).length ? (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {r.outcome === "DEFERRED" ? "Deferred" : "Completed"} • {r.eligibility_status === "NOT_ELIGIBLE" ? "Not eligible" : "Eligible"}
                  </div>
                  <span className="text-xs text-slate-500">{fmtDT(r.recorded_at || r.created_at)}</span>
                </div>
                {r.deferral_reason ? <div className="mt-2 text-sm text-slate-700"><b>Reason:</b> {r.deferral_reason}</div> : null}
                {r.notes ? <div className="mt-2 text-sm text-slate-600">{r.notes}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No blood donation records yet.</div>
        )}
      </Section>
    </div>
  );
}



function CounselingTab({ patientId, eventId, rows, setRows, canCreate }) {
  const [form, setForm] = useState({
    topics: "",
    session_notes: "",
    duration_minutes: "",
    visibility_level: "INTERNAL",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setErr("");
    setBusy(true);
    try {
      const topicsArr = String(form.topics || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      const payload = {
        patient: Number(patientId),
        topics: topicsArr,
        session_notes: form.session_notes || "",
        visibility_level: form.visibility_level || "INTERNAL",
      };
      if (form.duration_minutes !== "") payload.duration_minutes = Number(form.duration_minutes);

      const created = await outreachFetch("/outreach/counseling/", { eventId, method: "POST", body: JSON.stringify(payload) });
      setRows([created, ...(rows || [])]);
      setForm({ topics: "", session_notes: "", duration_minutes: "", visibility_level: "INTERNAL" });
    } catch (e2) {
      setErr(e2?.message || "Failed to save record.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Counseling record" icon={MessageCircleHeart}>
        {!canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            You don’t have permission to record counseling.
          </div>
        ) : null}
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <form onSubmit={submit} className="grid gap-3">
          <Field label="Topics (comma separated)">
            <TextInput value={form.topics} onChange={(e) => setForm((p) => ({ ...p, topics: e.target.value }))} placeholder="e.g. family planning, mental health" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Duration (minutes)">
              <TextInput type="number" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
            </Field>
            <Field label="Visibility">
              <Select value={form.visibility_level} onChange={(e) => setForm((p) => ({ ...p, visibility_level: e.target.value }))}>
                <option value="INTERNAL">Internal (staff)</option>
                <option value="PRIVATE">Private (restricted)</option>
              </Select>
            </Field>
          </div>

          <Field label="Session notes">
            <TextArea value={form.session_notes} onChange={(e) => setForm((p) => ({ ...p, session_notes: e.target.value }))} />
          </Field>

          <button
            disabled={busy || !canCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      </Section>

      <Section title="Counseling history" icon={MessageCircleHeart} right={<div className="text-sm text-slate-600">{(rows || []).length} record(s)</div>}>
        {(rows || []).length ? (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {(Array.isArray(r.topics) ? r.topics.join(", ") : r.topics) || "Counseling"}
                  </div>
                  <span className="text-xs text-slate-500">{fmtDT(r.recorded_at || r.created_at)}</span>
                </div>
                {r.duration_minutes != null ? <div className="mt-2 text-sm text-slate-700">Duration: <b>{r.duration_minutes}</b> min</div> : null}
                {r.session_notes ? <div className="mt-2 text-sm text-slate-600">{r.session_notes}</div> : null}
                {r.visibility_level ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Visibility: {String(r.visibility_level).toUpperCase() === "PRIVATE" ? "Private" : "Internal"}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No counseling records yet.</div>
        )}
      </Section>
    </div>
  );
}


function MaternalTab({ patientId, eventId, rows, setRows, canCreate }) {
  const [form, setForm] = useState({
    pregnancy_status: "UNKNOWN",
    gestational_age_weeks: "",
    risk_flags: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!canCreate) return;
    setErr("");
    setBusy(true);
    try {
      const riskFlagsArr = String(form.risk_flags || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      const payload = {
        patient: Number(patientId),
        pregnancy_status: form.pregnancy_status,
        risk_flags: riskFlagsArr,
        notes: form.notes || "",
      };
      if (form.gestational_age_weeks !== "") payload.gestational_age_weeks = Number(form.gestational_age_weeks);

      const created = await outreachFetch("/outreach/maternal/", { eventId, method: "POST", body: JSON.stringify(payload) });
      setRows([created, ...(rows || [])]);
      setForm({ pregnancy_status: "UNKNOWN", gestational_age_weeks: "", risk_flags: "", notes: "" });
    } catch (e2) {
      setErr(e2?.message || "Failed to save maternal record.");
    } finally {
      setBusy(false);
    }
  }

  const pregnancyLabel = (v) => {
    const s = String(v || "").toUpperCase();
    if (s === "PREGNANT") return "Pregnant";
    if (s === "NOT_PREGNANT") return "Not pregnant";
    return "Unknown";
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Maternal screening" icon={Baby}>
        {!canCreate ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            You don’t have permission to record maternal screening.
          </div>
        ) : null}
        {err ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

        <form onSubmit={submit} className="grid gap-3">
          <Field label="Pregnancy status">
            <Select value={form.pregnancy_status} onChange={(e) => setForm((p) => ({ ...p, pregnancy_status: e.target.value }))}>
              <option value="UNKNOWN">Unknown</option>
              <option value="PREGNANT">Pregnant</option>
              <option value="NOT_PREGNANT">Not pregnant</option>
            </Select>
          </Field>

          <Field label="Gestational age (weeks)">
            <TextInput type="number" value={form.gestational_age_weeks} onChange={(e) => setForm((p) => ({ ...p, gestational_age_weeks: e.target.value }))} />
          </Field>

          <Field label="Risk flags (comma separated)">
            <TextInput value={form.risk_flags} onChange={(e) => setForm((p) => ({ ...p, risk_flags: e.target.value }))} placeholder="e.g. hypertension, anemia" />
          </Field>

          <Field label="Notes">
            <TextArea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </Field>

          <button
            disabled={busy || !canCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      </Section>

      <Section title="Maternal history" icon={Baby} right={<div className="text-sm text-slate-600">{(rows || []).length} record(s)</div>}>
        {(rows || []).length ? (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{fmtDT(r.recorded_at || r.created_at)}</div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {pregnancyLabel(r.pregnancy_status)}
                  </span>
                </div>

                <div className="mt-2 text-sm text-slate-700">
                  {r.gestational_age_weeks != null ? `GA: ${r.gestational_age_weeks} weeks` : "GA: —"}
                </div>

                {(Array.isArray(r.risk_flags) ? r.risk_flags.length : !!r.risk_flags) ? (
                  <div className="mt-2 text-sm text-slate-700">
                    Risks: {Array.isArray(r.risk_flags) ? r.risk_flags.join(", ") : String(r.risk_flags)}
                  </div>
                ) : null}

                {r.notes ? <div className="mt-2 text-sm text-slate-600">{r.notes}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">No maternal records yet.</div>
        )}
      </Section>
    </div>
  );
}
