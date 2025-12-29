"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function BedHistoryPage() {
  const [mode, setMode] = useState("PATIENT"); // PATIENT | WARD

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState("");

  const [wards, setWards] = useState([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [selectedWard, setSelectedWard] = useState("");

  const [records, setRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPatients();
    loadWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPatients() {
    setLoadingPatients(true);
    try {
      const res = await apiFetch("/patients/?page=1&limit=100");
      const list = Array.isArray(res) ? res : res?.results || [];
      setPatients(list);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load patients.");
    } finally {
      setLoadingPatients(false);
    }
  }

  async function loadWards() {
    setLoadingWards(true);
    try {
      // Facility-scoped wards
      const me = await apiFetch("/accounts/me/");
      const facilityId = me?.facility?.id;
      if (!facilityId) {
        setWards([]);
        return;
      }

      // Prefer ward-summary (lighter + already in your backend)
      let res;
      try {
        res = await apiFetch(`/facilities/${facilityId}/ward-summary/`);
      } catch (e) {
        // Fallback to facility detail if ward-summary isn't available
        const detail = await apiFetch(`/facilities/${facilityId}/`);
        res = detail?.wards || [];
      }

      const list = Array.isArray(res) ? res : res?.results || [];
      // Normalize to {id, name}
      const normalized = list
        .map((w) => ({
          id: w.id,
          name: w.name,
          ward_type_display: w.ward_type_display,
          gender_policy_display: w.gender_policy_display,
          floor: w.floor,
        }))
        .filter((w) => w.id && w.name);

      setWards(normalized);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load wards.");
    } finally {
      setLoadingWards(false);
    }
  }

  async function loadPatientHistory(patientId) {
    if (!patientId) return;
    setLoadingHistory(true);
    setError(null);
    try {
      const res = await apiFetch(`/facilities/bed-assignments/?patient=${patientId}`);
      const items = Array.isArray(res) ? res : res?.results || [];
      setRecords(items);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bed history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadWardHistory(wardId) {
    if (!wardId) return;
    setLoadingHistory(true);
    setError(null);
    try {
      const res = await apiFetch(`/facilities/bed-assignments/?ward=${wardId}`);
      const items = Array.isArray(res) ? res : res?.results || [];
      setRecords(items);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load ward history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  function handlePatientChange(e) {
    const value = e.target.value;
    setSelectedPatient(value);
    if (value) loadPatientHistory(value);
    else setRecords([]);
  }

  function handleWardChange(e) {
    const value = e.target.value;
    setSelectedWard(value);
    if (value) loadWardHistory(value);
    else setRecords([]);
  }

  const selectedPatientObj = useMemo(
    () => patients.find((p) => String(p.id) === String(selectedPatient)),
    [patients, selectedPatient]
  );

  const patientDisplay = useMemo(() => {
    if (!selectedPatientObj) return "";
    return (
      [selectedPatientObj.first_name, selectedPatientObj.last_name].filter(Boolean).join(" ") ||
      selectedPatientObj.email ||
      selectedPatientObj.phone ||
      `Patient #${selectedPatientObj.id}`
    );
  }, [selectedPatientObj]);

  const selectedWardObj = useMemo(
    () => wards.find((w) => String(w.id) === String(selectedWard)),
    [wards, selectedWard]
  );

  const wardDisplay = useMemo(() => {
    if (!selectedWardObj) return "";
    return selectedWardObj.name || `Ward #${selectedWardObj.id}`;
  }, [selectedWardObj]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError(null);
    setRecords([]);

    // Clear the other selector to avoid confusion
    if (nextMode === "PATIENT") {
      setSelectedWard("");
    } else {
      setSelectedPatient("");
    }
  }

  const headerMetricA = mode === "PATIENT" ? "Patients loaded" : "Wards loaded";
  const headerMetricAValue =
    mode === "PATIENT" ? (loadingPatients ? "…" : patients.length) : loadingWards ? "…" : wards.length;

  const headerMetricB = mode === "PATIENT" ? "Selected patient" : "Selected ward";
  const headerMetricBValue = mode === "PATIENT" ? (patientDisplay || "None") : wardDisplay || "None";

  const headerMetricC = "History records";
  const headerMetricCValue = (mode === "PATIENT" ? selectedPatient : selectedWard) ? records.length : "—";

  const hasSelection = Boolean(mode === "PATIENT" ? selectedPatient : selectedWard);

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 px-5 py-5 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-emerald-500/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Inpatient audit trail
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Bed history
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-slate-500">
                View inpatient movement history by <span className="font-medium text-slate-700">patient</span> or by{" "}
                <span className="font-medium text-slate-700">ward</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-right text-xs text-slate-500 sm:grid-cols-3 md:text-sm">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500">{headerMetricA}</div>
                <div className="mt-0.5 text-lg font-semibold text-slate-900">{headerMetricAValue}</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500">{headerMetricB}</div>
                <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">{headerMetricBValue}</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500">{headerMetricC}</div>
                <div className="mt-0.5 text-lg font-semibold text-slate-900">{headerMetricCValue}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-rose-500" />
            <p>{error}</p>
          </div>
        )}

        {/* Selector */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />
          <div className="relative space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  {mode === "PATIENT" ? "Select patient" : "Select ward"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {mode === "PATIENT"
                    ? "Load a patient's full bed assignment trail."
                    : "Load all assignments that happened inside a ward (across all beds and patients)."}
                </p>
              </div>

              {/* Mode toggle */}
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50/70 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => switchMode("PATIENT")}
                  className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                    mode === "PATIENT" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  By patient
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("WARD")}
                  className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                    mode === "WARD" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  By ward
                </button>
              </div>
            </div>

            {/* Selector body */}
            {mode === "PATIENT" ? (
              loadingPatients ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">Loading patients…</p>
              ) : patients.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  No patients found for this facility.
                </p>
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <select
                    className="w-full max-w-lg rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    value={selectedPatient}
                    onChange={handlePatientChange}
                  >
                    <option value="">Select patient</option>
                    {patients.map((p) => {
                      const label =
                        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
                        p.email ||
                        p.phone ||
                        `Patient #${p.id}`;
                      return (
                        <option key={p.id} value={String(p.id)}>
                          {label}
                        </option>
                      );
                    })}
                  </select>

                  <div className="text-[11px] text-slate-500">
                    Tip: choose a patient to see all bed stays in this facility.
                  </div>
                </div>
              )
            ) : loadingWards ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">Loading wards…</p>
            ) : wards.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                No wards found for this facility.
              </p>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <select
                  className="w-full max-w-lg rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  value={selectedWard}
                  onChange={handleWardChange}
                >
                  <option value="">Select ward</option>
                  {wards.map((w) => {
                    const meta = [w.ward_type_display, w.gender_policy_display, w.floor].filter(Boolean).join(" • ");
                    return (
                      <option key={w.id} value={String(w.id)}>
                        {w.name}
                        {meta ? ` — ${meta}` : ""}
                      </option>
                    );
                  })}
                </select>

                <div className="text-[11px] text-slate-500">
                  Tip: ward history shows every assignment that occurred in that ward.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* History section */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-600 to-emerald-500" />
          <div className="relative space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                {mode === "PATIENT" ? "Bed assignment history" : "Ward assignment history"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {!hasSelection
                  ? mode === "PATIENT"
                    ? "Select a patient above to view their bed movement history."
                    : "Select a ward above to view all assignments that occurred in that ward."
                  : mode === "PATIENT"
                  ? `Timeline of every bed assignment recorded for ${patientDisplay}.`
                  : `Timeline of assignments that occurred in ${wardDisplay}.`}
              </p>
            </div>

            {!hasSelection && (
              <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-xs text-slate-500">
                {mode === "PATIENT"
                  ? "Choose a patient to see their admission and discharge trail across all wards and beds."
                  : "Choose a ward to see admissions/discharges that happened in that ward across all beds."}
              </div>
            )}

            {hasSelection && (
              <>
                {loadingHistory ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">Loading history…</p>
                ) : records.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    No history records found.
                  </p>
                ) : (
                  <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="min-w-full text-[11px]">
                      <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                        <tr>
                          {/* Ward mode needs patient column */}
                          {mode === "WARD" && (
                            <th className="px-3 py-2 text-left text-[11px] font-semibold">Patient</th>
                          )}
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">Bed</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">Ward</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">Status</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">Assigned</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">Admitted By</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">Discharged</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">Discharged By</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">Encounter</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {records.map((a) => (
                          <tr key={a.id} className="transition hover:bg-slate-50/70">
                            {mode === "WARD" && (
                              <td className="px-3 py-2">
                                {a.patient_display || `Patient #${a.patient}`}
                              </td>
                            )}
                            <td className="px-3 py-2">{a.bed_display || `Bed #${a.bed}`}</td>
                            <td className="px-3 py-2">{a.ward?.name || "—"}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                                  a.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-50 text-slate-600"
                                }`}
                              >
                                {a.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[10px] text-slate-600">
                              {a.assigned_at ? new Date(a.assigned_at).toLocaleString() : "—"}
                            </td>
                            <td className="px-3 py-2 text-[10px] text-slate-600">
                              {a.assigned_by_name || "—"}
                            </td>
                            <td className="px-3 py-2 text-[10px] text-slate-600">
                              {a.discharged_at
                                ? new Date(a.discharged_at).toLocaleString()
                                : a.status === "ACTIVE"
                                ? "Active"
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-[10px] text-slate-600">
                              {a.discharged_by_name || (a.status === "ACTIVE" ? "—" : "Unknown")}
                            </td>
                            <td className="px-3 py-2 text-[10px] text-slate-600">
                              {a.encounter ? `Encounter #${a.encounter}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}