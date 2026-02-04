// app/facility/patients/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  UsersRound,
  UserRoundSearch,
  Phone,
  Mail,
  Calendar,
  Loader2,
} from "lucide-react";

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

function formatAge(value) {
  if (!value) return "â€”";
  try {
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) return "â€”";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    return age >= 0 ? String(age) : "â€”";
  } catch {
    return "â€”";
  }
}

export default function FacilityPatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

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

  const filteredPatients = useMemo(() => {
    if (!filter.trim()) return patients;
    const q = filter.toLowerCase();
    return patients.filter((p) => {
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
      return (
        fullName.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q)
      );
    });
  }, [patients, filter]);

  const total = patients.length;
  const withEmail = patients.filter((p) => p.email).length;
  const withPhone = patients.filter((p) => p.phone).length;

  return (
    <main className="relative mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      {/* soft background accents */}
      <div className="pointer-events-none absolute -top-28 -left-32 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-32 h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <UsersRound className="h-3.5 w-3.5" />
            Facility patients
          </div>
          <h1 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Patients
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View and manage patients registered to this facility. Use search to
            quickly find a patient by name, email, or phone.
          </p>
        </div>

        <Link
          href="/facility/patients/new"
          className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          + New patient
        </Link>
      </header>

      {error && (
        <div className="relative rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Quick stats */}
      <section className="relative grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <UsersRound className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total patients
            </p>
            <p className="text-lg font-semibold text-slate-900">{total}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Mail className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              With email
            </p>
            <p className="text-lg font-semibold text-slate-900">{withEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Phone className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              With phone
            </p>
            <p className="text-lg font-semibold text-slate-900">{withPhone}</p>
          </div>
        </div>
      </section>

      {/* Table + search */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* top accent bar */}
        <div className="-mx-px -mt-px h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        {/* Search bar */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <UserRoundSearch className="h-3.5 w-3.5" />
              Search
            </div>
            <div className="flex w-full max-w-sm items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search by name, email, or phone…"
                className="flex-1 border-none bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Mobile/tablet cards */}
        <div className="lg:hidden">
          {loading && (
            <div className="p-4 text-center text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                Loading patients…
              </span>
            </div>
          )}

          {!loading && filteredPatients.length > 0 && (
            <div className="space-y-3 p-3 sm:p-4">
              {filteredPatients.map((p) => {
                const fullName = [p.first_name, p.last_name]
                  .filter(Boolean)
                  .join(" ");
                const displayName = fullName || p.email || `Patient #${p.id}`;

                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/facility/patients/${p.id}`}
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          {displayName}
                        </Link>
                        {p.mrn && (
                          <div className="mt-0.5 text-[11px] font-mono text-slate-500">
                            MRN: {p.mrn}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Age {formatAge(p.dob || p.date_of_birth)}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <UsersRound className="h-3.5 w-3.5 text-slate-400" />
                        <span>{p.gender || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="break-all">
                          {p.email || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span className="break-all">
                          {p.phone || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !filteredPatients.length && !error && (
            <div className="p-4 text-center text-sm text-slate-500">
              {patients.length === 0 && !filter ? (
                <>
                  No patients registered yet. Use{" "}
                  <span className="font-medium">New patient</span> to create
                  one.
                </>
              ) : (
                "No patients match your search."
              )}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Age
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
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      Loading patients…
                    </span>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredPatients.map((p) => {
                  const fullName = [p.first_name, p.last_name]
                    .filter(Boolean)
                    .join(" ");
                  const displayName =
                    fullName || p.email || `Patient #${p.id}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-800">
                        <div className="flex flex-col">
                          <Link
                            href={`/facility/patients/${p.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {displayName}
                          </Link>
                          {p.mrn && (
                            <span className="text-[11px] font-mono text-slate-500">
                              MRN: {p.mrn}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        <div className="inline-flex items-center gap-1">
                          {formatAge(p.dob || p.date_of_birth)}
                        </div>
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

              {!loading && !filteredPatients.length && !error && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    {patients.length === 0 && !filter ? (
                      <>
                        No patients registered yet. Use{" "}
                        <span className="font-medium">New patient</span> to
                        create one.
                      </>
                    ) : (
                      "No patients match your search."
                    )}
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
