"use client";

import { useMemo, useState } from "react";
import { usePayments } from "@/lib/usePayments";
import RecordPaymentModal from "@/components/billing/RecordPaymentModal";

function normalizeResults(payload) {
  if (!payload) return { count: 0, results: [] };
  if (Array.isArray(payload.results)) return payload;
  if (Array.isArray(payload)) return { count: payload.length, results: payload };
  if (typeof payload === "object") {
    const keys = Object.keys(payload).filter((k) => /^\d+$/.test(k));
    if (keys.length) {
      const results = keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => payload[k]);
      return { count: results.length, results };
    }
  }
  return { count: 0, results: [] };
}

function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

export default function FacilityPaymentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [patient, setPatient] = useState("");
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const params = useMemo(
    () => ({
      page,
      limit,
      patient: patient || undefined,
      method: method || undefined,
      s: search || undefined,
    }),
    [page, limit, patient, method, search]
  );

  const { data, error, isLoading, mutate } = usePayments(params);
  const { count, results } = normalizeResults(data);

  const onSaved = () => mutate?.();

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">Payments received in this facility scope.</p>
        </div>

        <button
          onClick={() => setShowPaymentModal(true)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Record payment
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-700">Search</label>
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Reference, note…"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Patient ID</label>
          <input
            value={patient}
            onChange={(e) => {
              setPage(1);
              setPatient(e.target.value);
            }}
            placeholder="e.g. 123"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Method</label>
          <select
            value={method}
            onChange={(e) => {
              setPage(1);
              setMethod(e.target.value);
            }}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="">All</option>
            {["CASH", "POS", "TRANSFER", "CARD", "CHEQUE", "OTHER"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Per page</label>
          <select
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value));
            }}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Payments</h2>
          <p className="text-xs text-slate-500">
            Showing {results.length} of {count || 0}
          </p>
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-slate-500">Loading payments…</div>
        ) : error ? (
          <div className="p-4 text-sm text-rose-700">{error.message}</div>
        ) : results.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-700">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Allocated</th>
                  <th className="px-3 py-2 text-right">Unallocated</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map((p) => (
                  <tr key={p.id} className="text-xs text-slate-700">
                    <td className="px-3 py-2 font-medium text-slate-900">#{p.id}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">
                        {p.patient_name || `Patient #${p.patient}`}
                      </div>
                      <div className="text-[11px] text-slate-500">ID: {p.patient}</div>
                    </td>
                    <td className="px-3 py-2">{p.method}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(p.amount)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(p.allocated_total)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(p.unallocated_total)}</td>
                    <td className="px-3 py-2">{p.reference || "—"}</td>
                    <td className="px-3 py-2">{fmtDate(p.received_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-500">No payments found.</div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <div className="text-xs text-slate-500">
            Page {page} • {count ? Math.ceil(count / limit) : 1} pages
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={count ? page >= Math.ceil(count / limit) : results.length < limit}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <RecordPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSaved={onSaved}
        defaultPatientId={patient || undefined}
        title="Record payment (Facility)"
      />
    </div>
  );
}
