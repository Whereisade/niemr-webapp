"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { resumeEncounter } from "@/lib/encounterActions";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FlaskConical,
  RefreshCw,
} from "lucide-react";

function normalizeList(body) {
  if (!body) return [];
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const numericKeys = Object.keys(body).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }
  return [];
}

function fmtDateTime(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

export default function FacilityEncounterWaitingLabsPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params?.id;

  const [encounter, setEncounter] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");

  async function loadAll(isRefresh = false) {
    if (!encounterId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const [enc, ord] = await Promise.all([
        apiFetch(`/encounters/${encounterId}/`, { method: "GET" }),
        apiFetch(`/labs/orders/?encounter=${encodeURIComponent(encounterId)}`, {
          method: "GET",
        }),
      ]);

      setEncounter(enc);
      setOrders(normalizeList(ord));
    } catch (err) {
      setError(err?.message || "Failed to load lab wait view.");
      setEncounter(null);
      setOrders([]);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  const hasAnyOrders = orders.length > 0;

  const allCompleted = useMemo(() => {
    if (!orders.length) return false;
    return orders.every((o) => String(o?.status || "").toUpperCase() === "COMPLETED");
  }, [orders]);

  async function handleResume() {
    if (!encounterId) return;
    setStatusUpdateError("");
    setStatusUpdating(true);
    try {
      await resumeEncounter(encounterId);
      router.push(`/facility/encounters/${encounterId}/workflow/prescription`); // CHANGED
    } catch (err) {
      setStatusUpdateError(err?.message || "Failed to resume encounter.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleSkipLabs() {
    if (!encounterId) return;
    setStatusUpdateError("");
    setStatusUpdating(true);
    try {
      await apiFetch(`/encounters/${encounterId}/skip_labs/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/facility/encounters/${encounterId}/workflow/prescription`); // CHANGED
    } catch (err) {
      setStatusUpdateError(err?.message || "Failed to skip labs.");
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (error && !encounter) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="font-semibold">Could not open waiting labs view</div>
          <div className="mt-1 text-sm">{error}</div>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/facility/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Encounter
            </Link>
            <button
              onClick={() => loadAll(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link
              href={`/facility/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Encounter
            </Link>
          </div>

          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Waiting for Lab Results
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Encounter #{encounterId} is read-only until you resume or skip labs.
          </p>
        </div>

        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {statusUpdateError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {statusUpdateError}
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <div className="text-sm font-semibold text-amber-900">
              Encounter is paused (WAITING_LABS)
            </div>
            <div className="mt-1 text-sm text-amber-900/80">
              Use <span className="font-medium">Resume</span> to continue to SOAP note,
              or <span className="font-medium">Skip Labs</span> to continue even without results.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">Lab Orders</h2>
            </div>
            <div className="text-xs text-slate-600">
              {hasAnyOrders ? `${orders.length} order(s)` : "No orders found for this encounter"}
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {orders.length ? (
              orders.map((o) => (
                <div key={o?.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      Lab Order #{o?.id}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <div>
                        Status: <span className="font-medium text-slate-900">{o?.status || "—"}</span>{" "}
                        • Ordered: {fmtDateTime(o?.ordered_at)}
                      </div>
                      {o?.id ? (
                        <Link
                          href={`/facility/labs/${o.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                          title="View this lab order and results"
                        >
                          View lab result
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {Array.isArray(o?.items) && o.items.length ? (
                    <div className="mt-2 overflow-auto rounded-lg border border-slate-100 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Test</th>
                            <th className="px-3 py-2">Result</th>
                            <th className="px-3 py-2">Flag</th>
                            <th className="px-3 py-2">Completed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {o.items.map((it) => (
                            <tr key={it?.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-900">
                                {it?.display_name || it?.test?.name || it?.requested_name || "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {it?.result_value != null
                                  ? `${it.result_value}${it?.result_unit ? ` ${it.result_unit}` : ""}`
                                  : it?.result_text
                                  ? it.result_text
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-700">{it?.flag || "—"}</td>
                              <td className="px-3 py-2 text-slate-700">
                                {it?.completed_at ? fmtDateTime(it.completed_at) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-600">No items.</div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-600">
                Nothing to show yet. If you expected orders, click Refresh.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Next Step</h2>
          <p className="mt-1 text-sm text-slate-600">
            {allCompleted
              ? "All lab orders look completed. You can resume to continue."
              : "You can resume at any time, or skip labs and continue without results."}
          </p>

          <div className="mt-4 grid gap-2">
            <button
              onClick={handleResume}
              disabled={statusUpdating}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Resume → SOAP Note
            </button>

            <button
              onClick={handleSkipLabs}
              disabled={statusUpdating}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              Skip Labs → SOAP Note
            </button>

            <Link
              href={`/facility/encounters/${encounterId}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Back to Encounter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
