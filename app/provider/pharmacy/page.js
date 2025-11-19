"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { usePrescriptions } from "@/lib/usePrescriptions";
import {
  Pill,
  Filter,
  UsersRound,
  ClipboardList,
  Clock,
  Activity,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

export default function ProviderPharmacyPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const status = sp.get("status") || "";
  const patient = sp.get("patient") || "";
  const s = sp.get("s") || "";

  // Backend scopes prescriptions by facility / role in PrescriptionViewSet.get_queryset()
  const { data, error, isLoading } = usePrescriptions({
    page,
    limit,
    status,
    patient,
    s,
  });

  const rows = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
  const total = Number(data?.count ?? rows.length);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    if ("status" in patch || "patient" in patch || "s" in patch || "limit" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Prescriptions
        </h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="-mt-6 mb-4 h-1.5 w-full rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <p className="text-slate-500">Loading prescriptions…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Prescriptions
        </h1>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  // Quick stats
  const uniquePatients = new Set(
    rows.map((r) => r.patient_name || r.patient)
  ).size;
  const drafts = rows.filter(
    (r) => String(r.status || "").toUpperCase() === "DRAFT"
  ).length;
  const active = rows.filter((r) => {
    const v = String(r.status || "").toUpperCase();
    return v === "PENDING" || v === "DISPENSED";
  }).length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Pill className="h-3.5 w-3.5" />
            Provider Pharmacy
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Medication prescriptions for patients in my care
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter by patient, drug or status and review e-Rx activity.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search drug / note */}
          <div className="relative">
            <input
              type="search"
              placeholder="Search drug / note…"
              defaultValue={s}
              onBlur={(e) => updateQuery({ s: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-56"
            />
            <Activity className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Patient filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by patient ID…"
              defaultValue={patient}
              onBlur={(e) => updateQuery({ patient: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-56"
            />
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Status */}
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-40"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="DISPENSED">Dispensed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Page size */}
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-32"
            value={String(limit)}
            onChange={(e) => updateQuery({ limit: e.target.value })}
          >
            <option value="20">Show 20</option>
            <option value="50">Show 50</option>
            <option value="100">Show 100</option>
          </select>
        </div>
      </header>

      {/* Quick stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={UsersRound}
          label="Patients in results"
          value={uniquePatients || 0}
          accent="from-blue-600 via-indigo-600 to-violet-600"
        />
        <StatTile
          icon={ClipboardList}
          label="Prescriptions on page"
          value={rows.length}
          accent="from-emerald-600 via-teal-600 to-cyan-600"
        />
        <StatTile
          icon={Pill}
          label="Active e-Rx (pending / dispensed)"
          value={active}
          accent="from-amber-600 via-orange-600 to-red-600"
        />
        <StatTile
          icon={Activity}
          label="Drafts on page"
          value={drafts}
          accent="from-fuchsia-600 via-pink-600 to-rose-600"
        />
      </section>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Patient</Th>
              <Th>Medications</Th>
              <Th>Status</Th>
              <Th>Prescribed At</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((rx) => {
              const meds = Array.isArray(rx.items)
                ? rx.items
                    .map(
                      (i) =>
                        i.drug_name ||
                        i.medication ||
                        i.product ||
                        i.code
                    )
                    .filter(Boolean)
                    .join(", ")
                : rx.medications_display || "—";

              return (
                <tr
                  key={rx.id}
                  className="transition hover:bg-slate-50/60"
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/10">
                        <UsersRound className="h-4 w-4 text-blue-700" />
                      </span>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {rx.patient_name || rx.patient || "—"}
                        </div>
                        {rx.encounter_id && (
                          <div className="text-xs text-slate-500">
                            Encounter #{rx.encounter_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                      <Pill className="h-3.5 w-3.5 text-slate-500" />
                      <span className="line-clamp-2">{meds}</span>
                    </span>
                    {rx.sig && (
                      <div className="mt-1 text-xs text-slate-500">
                        {rx.sig}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <StatusPill value={rx.status} />
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {formatDateTime(rx.prescribed_at || rx.created_at)}
                    </span>
                  </Td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                    <Pill className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    No prescriptions found
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    New prescriptions will appear here automatically.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pager – aligned with vitals/imaging pattern */}
      <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
        <div>
          Page {page} · {total} total
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateQuery({ page: page - 1 })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            disabled={rows.length < limit}
            onClick={() => updateQuery({ page: page + 1 })}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 shadow-sm hover:border-slate-300 disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}

/* ─────────────── UI helpers (UI-only) ─────────────── */

function StatTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">{label}</div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
        <div className="mt-2 text-3xl font-semibold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const map = {
    DRAFT: "bg-slate-50 text-slate-700 ring-slate-200",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    DISPENSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-slate-50 text-slate-700 ring-slate-200";
  const label = (v || "—").replaceAll("_", " ");
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function Th({ children }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="p-3 align-top text-sm text-slate-800">{children}</td>;
}
