"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function BedHistoryPage() {
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPatients();
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

  async function loadHistory(patientId) {
    if (!patientId) return;
    setLoadingHistory(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/facilities/bed-assignments/?patient=${patientId}`
      );
      const items = Array.isArray(res) ? res : res?.results || [];
      setAssignments(items);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load bed history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  function handlePatientChange(e) {
    const value = e.target.value;
    setSelectedPatient(value);
    if (value) {
      loadHistory(value);
    } else {
      setAssignments([]);
    }
  }

  const selectedPatientObj = patients.find(
    (p) => String(p.id) === String(selectedPatient)
  );

  const patientDisplay =
    selectedPatientObj &&
    ([selectedPatientObj.first_name, selectedPatientObj.last_name]
      .filter(Boolean)
      .join(" ") ||
      selectedPatientObj.email ||
      selectedPatientObj.phone ||
      `Patient #${selectedPatientObj.id}`);

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
                View a patient&apos;s full bed assignment timeline within your
                facility &mdash; including admission and discharge events.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-right text-xs text-slate-500 sm:grid-cols-3 md:text-sm">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500">
                  Patients loaded
                </div>
                <div className="mt-0.5 text-lg font-semibold text-slate-900">
                  {loadingPatients ? "…" : patients.length}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500">
                  Selected patient
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                  {patientDisplay || "None"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                <div className="text-[11px] font-medium text-slate-500">
                  History records
                </div>
                <div className="mt-0.5 text-lg font-semibold text-slate-900">
                  {selectedPatient ? assignments.length : "—"}
                </div>
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

        {/* Patient selector */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />
          <div className="relative space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Select patient
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Search within patients attached to this facility and load their
                  full bed assignment trail.
                </p>
              </div>

              {patientDisplay && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-700">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/10 text-[11px] font-semibold text-blue-700">
                    {patientDisplay
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      {patientDisplay}
                    </span>
                    {selectedPatientObj?.id && (
                      <span className="text-[11px] text-slate-500">
                        Patient ID: {selectedPatientObj.id}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {loadingPatients ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Loading patients…
              </p>
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
                  Tip: pick a patient to load all their historical and active bed
                  stays in this facility.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* History section */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-600 to-emerald-500" />
          <div className="relative space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Bed assignment history
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedPatient
                    ? `Timeline of every bed assignment recorded for ${patientDisplay}.`
                    : "Select a patient above to view their bed movement history."}
                </p>
              </div>
            </div>

            {!selectedPatient && (
              <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-xs text-slate-500">
                Choose a patient to see their admission and discharge trail
                across all wards and beds.
              </div>
            )}

            {selectedPatient && (
              <>
                {loadingHistory ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    Loading history…
                  </p>
                ) : assignments.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    No bed assignments recorded for this patient.
                  </p>
                ) : (
                  <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="min-w-full text-[11px]">
                      <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">
                            Bed
                          </th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">
                            Ward
                          </th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">
                            Assigned
                          </th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">
                            Discharged
                          </th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold">
                            Encounter
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assignments.map((a) => (
                          <tr
                            key={a.id}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-3 py-2">
                              {a.bed_display || `Bed #${a.bed}`}
                            </td>
                            <td className="px-3 py-2">
                              {a.ward?.name || "—"}
                            </td>
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
                              {a.assigned_at
                                ? new Date(
                                    a.assigned_at
                                  ).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-[10px] text-slate-600">
                              {a.discharged_at
                                ? new Date(
                                    a.discharged_at
                                  ).toLocaleString()
                                : a.status === "ACTIVE"
                                ? "Active"
                                : "—"}
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


