// app/facility/patients/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

export default function FacilityPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch("/patients/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setPatients(items);
      } catch (err) {
        console.error("Failed to load patients", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load patients. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPatients();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Patients
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View and manage patients registered to this facility.
          </p>
        </div>

        <Link
          href="/facility/patients/new"
          className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          New patient
        </Link>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  DOB
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gender
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    Loading patients…
                  </td>
                </tr>
              )}

              {!loading &&
                patients.map((p) => {
                  const fullName = [p.first_name, p.last_name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-800">
                        {fullName || p.email || `Patient #${p.id}`}
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        {formatDate(p.date_of_birth)}
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        {p.gender || "—"}
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        {p.email || "—"}
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        {p.phone || "—"}
                      </td>
                    </tr>
                  );
                })}

              {!loading && !patients.length && !error && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    No patients registered yet. Use{" "}
                    <span className="font-medium">New patient</span> to create
                    one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
