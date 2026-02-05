"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEncounters } from "@/lib/useEncounters";
import { downloadEncounterPdf } from "@/lib/reports";
import AttachmentList from "@/components/attachments/AttachmentList";
import {
  Stethoscope,
  Building2,
  CalendarClock,
  FileText,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
} from "lucide-react";


export default function PatientEncountersPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <PatientEncountersPageInner {...props} />
    </Suspense>
  );
}

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

function PatientEncountersPageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 10);
  const status = sp.get("status") || "";
  const s = sp.get("s") || "";

  // Backend scopes encounters by PATIENT automatically for patient role
  const { data, error, isLoading } = useEncounters({
    page,
    limit,
    status: status || undefined,
    s: s || undefined,
    scope: "patient",
  });

  const rows = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
  const total = Number(data?.count ?? rows.length);

  const [attachmentsFor, setAttachmentsFor] = useState(null); // { id, label } | null
  const [downloadingId, setDownloadingId] = useState(null);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    if ("status" in patch || "s" in patch) params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          My Encounters
        </h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 -mt-6 mb-4 rounded-t-xl" />
          <p className="text-slate-500">Loading encountersâ€¦</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          My Encounters
        </h1>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  // derive small page-level stats (UI only, from the visible page)
  const openCount = rows.filter(
    (r) => (r.status || "").toUpperCase() === "OPEN"
  ).length;
  const closedCount = rows.filter(
    (r) => (r.status || "").toUpperCase() === "CLOSED"
  ).length;
  const crossedOut = rows.filter(
    (r) => (r.status || "").toUpperCase() === "CROSSED_OUT"
  ).length;

  async function handleDownload(enc) {
    if (!enc?.id) return;
    try {
      setDownloadingId(enc.id);
      await downloadEncounterPdf(enc.id);
    } catch (err) {
      console.error("Download failed", err);
      alert(err?.message || "Failed to download encounter report.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <ClipboardList className="h-3.5 w-3.5" />
            Patient Portal
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            My Encounters
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            A record of your past and ongoing visits with facilities and
            providers.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <input
              type="search"
              placeholder="Search complaint / diagnosisâ€¦"
              defaultValue={s}
              onBlur={(e) => updateQuery({ s: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-72"
            />
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-44"
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value })}
            >
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="CROSSED_OUT">Crossed Out</option>
            </select>
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </header>

      {/* Page stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          icon={FileText}
          label="Encounters on page"
          value={rows.length}
          gradient="from-blue-600 via-indigo-600 to-violet-600"
        />
        <Tile
          icon={Stethoscope}
          label="Open"
          value={openCount}
          gradient="from-emerald-600 via-teal-600 to-cyan-600"
        />
        <Tile
          icon={Building2}
          label="Closed"
          value={closedCount}
          gradient="from-amber-600 via-orange-600 to-red-600"
        />
        <Tile
          icon={CalendarClock}
          label="Crossed Out"
          value={crossedOut}
          gradient="from-fuchsia-600 via-pink-600 to-rose-600"
        />
      </section>

      {/* Table (desktop) */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Provider</Th>
              <Th>Facility</Th>
              <Th>When</Th>
              <Th>Status</Th>
              <Th>Summary</Th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Report
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Files
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((enc) => {
              const providerName = enc.provider_name || enc.provider || "—";
              const facilityName = enc.facility_name || enc.facility || "—";
              const whenLabel = formatDateTime(
                enc.occurred_at || enc.created_at
              );

              return (
                <tr
                  key={enc.id}
                  className="transition hover:bg-slate-50/60"
                >
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-50">
                        <Stethoscope className="h-4 w-4 text-slate-700" />
                      </span>
                      <span className="text-slate-900">
                        {providerName}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2 text-slate-700">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      {facilityName}
                    </span>
                  </Td>
                  <Td>
                    <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                      {whenLabel}
                    </span>
                  </Td>
                  <Td>
                    <StatusPill value={enc.status} />
                  </Td>
                  <Td>
                    <span className="line-clamp-2 text-slate-800">
                      {enc.chief_complaint || enc.summary || "—"}
                    </span>
                  </Td>

                  <td className="p-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => handleDownload(enc)}
                      disabled={downloadingId === enc.id}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingId === enc.id ? "Generatingâ€¦" : "PDF"}
                    </button>
                  </td>

                  <td className="p-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setAttachmentsFor({
                          id: enc.id,
                          label: `${providerName} @ ${facilityName} Â· #${enc.id}`,
                        })
                      }
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Attachments
                    </button>
                  </td>

                  <td className="p-3 text-right text-sm">
                    <Link
                      href={`/patient/encounters/${enc.id}`}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    No encounters found
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Try adjusting your search or status filter.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile/tablet) */}
      <div className="md:hidden">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="divide-y divide-slate-100">
            {rows.map((enc) => {
              const providerName = enc.provider_name || enc.provider || "—";
              const facilityName = enc.facility_name || enc.facility || "—";
              const whenLabel = formatDateTime(
                enc.occurred_at || enc.created_at
              );

              return (
                <div key={enc.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-50">
                          <Stethoscope className="h-4 w-4 text-slate-700" />
                        </span>
                        <span className="truncate">{providerName}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{facilityName}</span>
                      </div>
                    </div>
                    <StatusPill value={enc.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700">
                      {whenLabel}
                    </span>
                    <span className="text-slate-400">â€¢</span>
                    <span className="line-clamp-2">
                      {enc.chief_complaint || enc.summary || "—"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(enc)}
                      disabled={downloadingId === enc.id}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingId === enc.id ? "Generatingâ€¦" : "PDF"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachmentsFor({
                          id: enc.id,
                          label: `${providerName} @ ${facilityName} Â· #${enc.id}`,
                        })
                      }
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Attachments
                    </button>
                    <Link
                      href={`/patient/encounters/${enc.id}`}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}

            {!rows.length && (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <div className="text-sm font-medium text-slate-900">
                  No encounters found
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Try adjusting your search or status filter.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Pager */}
      <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
        <div>
          Page {page} Â· {total} total
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

      {/* Attachments modal (view-only) */}
      {attachmentsFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Encounter attachments
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {attachmentsFor.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttachmentsFor(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="sr-only">Close</span>
                âœ•
              </button>
            </div>

            <div className="px-4 py-3">
              <AttachmentList
                refType="ENCOUNTER"
                refId={attachmentsFor.id}
                canUpload={false} // patient: view-only
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ UI helpers (UI-only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function Tile({ icon: Icon, label, value, gradient }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />
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
    OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CLOSED: "bg-slate-50 text-slate-700 ring-slate-200",
    CROSSED_OUT: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[v] || "bg-amber-50 text-amber-700 ring-amber-200";
  const label = v || "—";
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-xs ring-1 ${cls}`}
    >
      {label.replaceAll("_", " ")}
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
  return <td className="p-3 text-sm text-slate-800">{children}</td>;
}


