"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEncounters } from "@/lib/useEncounters";
import { downloadEncounterPdf } from "@/lib/reports";
import AttachmentList from "@/components/attachments/AttachmentList";
import {
  closeEncounter,
} from "@/lib/encounterActions";
import {
  Building2,
  Users2,
  FileText,
  Search,
  Filter,
  UserRound,
  Stethoscope,
  CalendarClock,
  ArrowLeft,
  ArrowRight,
  Activity,
} from "lucide-react";


export default function FacilityEncountersPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <FacilityEncountersPageInner {...props} />
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


function sortNewestFirst(items) {
  const arr = Array.isArray(items) ? [...items] : [];
  arr.sort((a, b) => {
    const ta = new Date(a?.created_at || a?.occurred_at || 0).getTime();
    const tb = new Date(b?.created_at || b?.occurred_at || 0).getTime();
    if (tb != ta) return tb - ta;
    const ida = Number(a?.id || 0);
    const idb = Number(b?.id || 0);
    return idb - ida;
  });
  return arr;
}

function FacilityEncountersPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(searchParams.get("page") || 1);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("s") || "";
  const mine = searchParams.get("mine") === "1";

  // 🔹 Fetch current user for role-based header
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          throw new Error("Failed to load current user");
        }
        const json = await res.json();
        if (!cancelled) {
          setMe(json);
        }
      } catch (err) {
        console.error("Failed to fetch /accounts/me/ in encounters page:", err);
        if (!cancelled) {
          setMe(null);
        }
      } finally {
        if (!cancelled) {
          setMeLoading(false);
        }
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data, loading, error } = useEncounters({
    page,
    status: status || undefined,
    mine,
    search: search || undefined,
    scope: "facility",
  });

  const [rows, setRows] = useState([]);
  const [attachmentsFor, setAttachmentsFor] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [updateError, setUpdateError] = useState("");

  // Normalize data -> rows
  useEffect(() => {
    if (Array.isArray(data?.results)) {
      setRows(sortNewestFirst(data.results));
    } else if (Array.isArray(data)) {
      setRows(sortNewestFirst(data));
    } else if (data && typeof data === "object") {
      const numericKeys = Object.keys(data).filter((k) => /^\d+$/.test(k));
      if (numericKeys.length) {
        setRows(
          sortNewestFirst(
            numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => data[k])
          )
        );
      } else {
        setRows([]);
      }
    } else {
      setRows([]);
    }
  }, [data]);

  const total = Number(data?.count ?? (rows.length || 0));

  const openCount = rows.filter(
    (e) => e.status === "OPEN" || e.status === "IN_PROGRESS"
  ).length;
  const closedCount = rows.filter((e) => e.status === "CLOSED").length;

  // 🔹 Determine header text based on role
  const meRole = (me?.role || "").toUpperCase();
  const headerTitle = meRole === "DOCTOR"
    ? "My Encounters"
    : meRole === "NURSE"
      ? "Nurse Encounters"
      : "Facility Encounters";
  const headerSubtitle = meRole === "DOCTOR"
    ? "Your completed and ongoing clinical encounters."
    : meRole === "NURSE"
      ? "View and assign all clinical encounters."
      : "View all encounters created under this facility, across all providers.";

  function setQuery(next) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        sp.delete(key);
      } else {
        sp.set(key, String(value));
      }
    });
    router.push(`${pathname}?${sp.toString()}`);
  }

  async function handleDownload(encounterId) {
    if (!encounterId) return;
    try {
      setDownloadingId(encounterId);
      await downloadEncounterPdf(encounterId);
    } catch (err) {
      console.error("Failed to download encounter PDF", err);
      alert(
        err?.message ||
          "Failed to download encounter report. Please try again."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-lg font-semibold text-slate-900">
          Facility Encounters
        </h1>
        <p className="mt-2 text-sm text-red-700">
          {typeof error === "string"
            ? error
            : error?.message || "Failed to load encounters."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {headerTitle}
            </h1>
            <p className="text-xs text-slate-500">
              {headerSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Building2 className="mr-1 h-4 w-4" />
          {meRole === "DOCTOR" ? "Personal view" : meRole === "NURSE" ? "Clinical view" : "Facility-wide view"}
        </div>
      </header>

      {/* Summary tiles */}
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total</p>
            <Users2 className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {total}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-700">Open</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">
            {openCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Closed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {closedCount}
          </p>
        </div>
      </section>

      {/* Filters + search */}
      <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
          {[
            { label: "All", value: "" },
            { label: "Open", value: "OPEN" },
            { label: "Closed", value: "CLOSED" },
          ].map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() =>
                  setQuery({ status: opt.value || null, page: 1 })
                }
                className={[
                  "rounded-full px-3 py-1 font-medium",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-white/60",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const value = formData.get("s")?.toString() || "";
            setQuery({ s: value || null, page: 1 });
          }}
          className="flex w-full max-w-xs items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
        >
          <Search className="h-4 w-4 text-slate-400" />
          <input
            name="s"
            defaultValue={search}
            placeholder="Search by patient, provider, summary…"
            className="flex-1 border-none bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </form>
      </section>

      {updateError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {updateError}
        </div>
      )}

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Nurse
                  </div>
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  <div className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    Provider
                  </div>
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  When
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Summary
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Report
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Files
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    Loading encounters…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((enc) => (
                  <tr key={enc.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                          <UserRound className="h-4 w-4 text-slate-500" />
                        </span>
                        <div>
                          <div className="font-medium">
                            {enc.patient_name || enc.patient || "—"}
                          </div>
                          {enc.patient_identifier && (
                            <div className="text-[11px] text-slate-500">
                              {enc.patient_identifier}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* NEW: Nurse column */}
                    <td className="p-3 text-sm text-slate-800">
                      {enc.nurse_name ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-50">
                            <Activity className="h-4 w-4 text-purple-600" />
                          </span>
                          <div>
                            <div className="font-medium">{enc.nurse_name}</div>
                            <div className="text-[11px] text-slate-500">Nurse</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* UPDATED: Provider column (doctor) */}
                    <td className="p-3 text-sm text-slate-800">
                      {enc.provider_name ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50">
                            <Stethoscope className="h-4 w-4 text-blue-600" />
                          </span>
                          <div>
                            <div className="font-medium">{enc.provider_name}</div>
                            <div className="text-[11px] text-slate-500">Doctor</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="p-3 text-xs text-slate-700">
                      <div className="flex items-center gap-1">
                        <CalendarClock className="h-4 w-4 text-slate-400" />
                        <span>{formatDateTime(enc.occurred_at)}</span>
                      </div>
                    </td>

                    <td className="p-3 text-xs text-slate-800">
                      {enc.status === "OPEN" || enc.status === "IN_PROGRESS" ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          {enc.status === "IN_PROGRESS"
                            ? "In progress"
                            : "Open"}
                        </span>
                      ) : enc.status === "CLOSED" ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          Closed
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {enc.status || "—"}
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-xs text-slate-700">
                      <p className="line-clamp-2">
                        {enc.summary ||
                          enc.chief_complaint ||
                          enc.reason ||
                          "—"}
                      </p>
                    </td>

                    <td className="p-3 text-xs text-slate-800">
                      <button
                        type="button"
                        onClick={() => handleDownload(enc.id)}
                        disabled={downloadingId === enc.id}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <FileText className="h-3 w-3" />
                        {downloadingId === enc.id ? "Downloading…" : "PDF"}
                      </button>
                    </td>

                    <td className="p-3 text-xs text-slate-800">
                      <button
                        type="button"
                        onClick={() => setAttachmentsFor(enc)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Attachments
                      </button>
                    </td>

                    <td className="p-3 text-xs text-slate-800">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setUpdateError("");
                            setUpdatingId(enc.id);
                            try {
                              const res = await closeEncounter(enc.id);
                              const newStatus =
                                res &&
                                typeof res === "object" &&
                                res.status
                                  ? res.status
                                  : "CLOSED";
                              setRows((prev) =>
                                prev.map((e) =>
                                  e.id === enc.id
                                    ? { ...e, status: newStatus }
                                    : e
                                )
                              );
                            } catch (err) {
                              console.error(
                                "Facility close encounter failed",
                                err
                              );
                              setUpdateError(
                                err?.message ||
                                  "Failed to close encounter. Please try again."
                              );
                            } finally {
                              setUpdatingId(null);
                            }
                          }}
                          disabled={updatingId === enc.id}
                          className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {updatingId === enc.id ? "Closing…" : "Close"}
                        </button>

                        <Link
                          href={`/facility/encounters/${enc.id}`}
                          className="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && !rows.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    No encounters found for this facility.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
          <div>
            Page {page} •{" "}
            {rows.length
              ? `Showing ${(page - 1) * rows.length + 1}–${
                  (page - 1) * rows.length + rows.length
                } of ${total}`
              : `Total ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => page > 1 && setQuery({ page: page - 1 })}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft className="h-3 w-3" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setQuery({ page: page + 1 })}
              disabled={!rows.length || rows.length === 0}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Next
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Attachments drawer */}
      {attachmentsFor && (
        <AttachmentList
          open={!!attachmentsFor}
          onClose={() => setAttachmentsFor(null)}
          objectType="encounter"
          objectId={attachmentsFor.id}
          title="Encounter attachments"
        />
      )}
    </main>
  );
}