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
    ([
      selectedPatientObj.first_name,
      selectedPatientObj.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
      selectedPatientObj.email ||
      selectedPatientObj.phone ||
      `Patient #${selectedPatientObj.id}`);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bed history</h1>
        <p className="mt-1 text-sm text-gray-500">
          View bed assignment history per patient within this facility.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Patient selector */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold mb-2">Select patient</h2>
        {loadingPatients ? (
          <p className="text-xs text-gray-500">Loading patients…</p>
        ) : patients.length === 0 ? (
          <p className="text-xs text-gray-500">
            No patients found for this facility.
          </p>
        ) : (
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <select
              className="w-full max-w-md rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            {patientDisplay && (
              <div className="text-xs text-gray-600">
                Selected:&nbsp;
                <span className="font-medium text-gray-900">
                  {patientDisplay}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* History table */}
      {selectedPatient && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-3">
            Bed history for {patientDisplay}
          </h2>

          {loadingHistory ? (
            <p className="text-xs text-gray-500">Loading history…</p>
          ) : assignments.length === 0 ? (
            <p className="text-xs text-gray-500">
              No bed assignments recorded for this patient.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">
                      Bed
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Ward
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Assigned
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Discharged
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Encounter
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
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
                              : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-gray-600">
                        {a.assigned_at
                          ? new Date(a.assigned_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-gray-600">
                        {a.discharged_at
                          ? new Date(a.discharged_at).toLocaleString()
                          : a.status === "ACTIVE"
                          ? "Active"
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-gray-600">
                        {a.encounter ? `Encounter #${a.encounter}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}


