"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEncounters } from "@/lib/useEncounters";
import { downloadEncounterPdf } from "@/lib/reports";
import {
  closeEncounter,
  crossOutEncounter,
} from "@/lib/encounterActions";
import AttachmentList from "@/components/attachments/AttachmentList";
import {
  Stethoscope,
  Search,
  Filter,
  CalendarClock,
  FileText,
  UserRound,
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

export default function ProviderEncountersPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 10);
  const status = sp.get("status") || "";
  const s = sp.get("s") || "";

  const { data, error, isLoading } = useEncounters({ page, limit, status, s });

  const rows = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
  const total = Number(data?.count ?? rows.length);

  const [attachmentsFor, setAttachmentsFor] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [updateError, setUpdateError] = useState("");

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
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Encounters
        </h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 -mt-6 h-1.5 w-full rounded-t-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <p className="text-slate-500">Loading encounters…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Encounters
        </h1>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

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
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Stethoscope className="h-3.5 w-3.5" />
            Provider Workspace
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Encounters
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Clinical encounters recorded for patients in this facility.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <input
              type="search"
              placeholder="Search complaint / diagnosis / plan…"
              defaultValue={s}
              onBlur={(e) => updateQuery({ s: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-72"
            />
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-44"
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

      {/* Stats row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={FileText}
          label="Encounters on page"
          value={rows.length}
          gradient="from-blue-600 via-indigo-600 to-violet-600"
        />
        <StatTile
          icon={CalendarClock}
          label="Open"
          value={openCount}
          gradient="from-emerald-600 via-teal-600 to-cyan-600"
        />
        <StatTile
          icon={CalendarClock}
          label="Closed"
          value={closedCount}
          gradient="from-amber-600 via-orange-600 to-red-600"
        />
        <StatTile
          icon={CalendarClock}
          label="Crossed Out"
          value={crossedOut}
          gradient="from-fuchsia-600 via-pink-600 to-rose-600"
        />
      </section>

      {updateError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {updateError}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <Th>Patient</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Started</Th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Report
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Files
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((enc) => {
              const patientName = enc.patient_name || enc.patient || "Patient";
              const typeLabel =
                enc.encounter_type || enc.type || "Encounter";

              return (
                <tr key={enc.id} className="hover:bg-slate-50">
                  {/* Patient cell with link */}
                  <td className="p-3 text-sm text-slate-800">
                    <Link
                      href={`/provider/encounters/${enc.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {patientName}
                    </Link>
                  </td>

                  <Td>{typeLabel}</Td>
                  <Td>
                    <StatusPill value={enc.status} />
                  </Td>
                  <Td>
                    {formatDateTime(
                      enc.started_at || enc.created_at || "—"
                    )}
                  </Td>

                  <td className="p-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => handleDownload(enc)}
                      disabled={downloadingId === enc.id}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingId === enc.id ? "Generating…" : "PDF"}
                    </button>
                  </td>

                  <td className="p-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setAttachmentsFor({
                          id: enc.id,
                          label: `${patientName} · ${typeLabel} #${enc.id}`,
                        })
                      }
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Attachments
                    </button>
                  </td>

                  {/* Actions: Close / Cross out */}
                  <td className="p-3 text-xs text-slate-800 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setUpdateError("");
                          setUpdatingId(enc.id);
                          try {
                            await closeEncounter(enc.id);
                            router.refresh();
                          } catch (err) {
                            console.error("Close encounter failed", err);
                            setUpdateError(
                              err?.message ||
                                "Failed to close encounter. Please try again."
                            );
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                        disabled={updatingId === enc.id}
                        className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingId === enc.id ? "Closing…" : "Close"}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const ok = window.confirm(
                            "Are you sure you want to cross out this encounter? This is usually used to invalidate a note."
                          );
                          if (!ok) return;

                          setUpdateError("");
                          setUpdatingId(enc.id);
                          try {
                            await crossOutEncounter(enc.id);
                            router.refresh();
                          } catch (err) {
                            console.error(
                              "Cross out encounter failed",
                              err
                            );
                            setUpdateError(
                              err?.message ||
                                "Failed to cross out encounter. Please try again."
                            );
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                        disabled={updatingId === enc.id}
                        className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingId === enc.id ? "Updating…" : "Cross out"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    No encounters found
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Try adjusting search or status.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Attachments modal */}
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
                ✕
              </button>
            </div>

            <div className="px-4 py-3">
              <AttachmentList
                refType="ENCOUNTER"
                refId={attachmentsFor.id}
                canUpload={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pager */}
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

function StatTile({ icon: Icon, label, value, gradient }) {
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
