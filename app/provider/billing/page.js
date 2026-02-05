"use client";

import { useMemo, useState } from "react";
import { useCharges } from "@/lib/useCharges";
import { useBillingLedger } from "@/lib/useBillingLedger";
import RevenueByServicePanel from "@/components/billing/RevenueByServicePanel";
import RecordPaymentModal from "@/components/billing/RecordPaymentModal";
import PatientDropdown from "@/components/billing/PatientDropdown";

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

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
  { value: "VOID", label: "Void" },
];

export default function ProviderBillingPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [patient, setPatient] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const params = useMemo(
    () => ({
      page,
      limit,
      patient: patient || undefined,
      status: status || undefined,
      s: search || undefined,
    }),
    [page, limit, patient, status, search]
  );

  const { data, error, isLoading, mutate } = useCharges(params);
  const { count, results } = normalizeResults(data);

  const ledgerEnabled = Boolean(patient);
  const ledger = useBillingLedger(
    patient ? { patient } : {},
    { enabled: ledgerEnabled }
  );

  const onSaved = () => {
    mutate?.();
    ledger.mutate?.();
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
          <p className="text-sm text-slate-500">
            Manage charges & payments for your independent practice scope.
          </p>
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
            placeholder="Service code/name, description…"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Patient</label>
          <PatientDropdown
            value={patient}
            onChange={(val) => {
              setPage(1);
              setPatient(val);
            }}
            placeholder="All patients"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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

      {/* Ledger */}
      {ledgerEnabled ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Patient ledger</h2>
          {ledger.isLoading && !ledger.data ? (
            <div className="mt-3 text-sm text-slate-500">Loading ledger…</div>
          ) : ledger.error ? (
            <div className="mt-3 text-sm text-rose-700">{ledger.error.message}</div>
          ) : ledger.data ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="text-xs text-slate-500">Charges</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(ledger.data.charges_total)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="text-xs text-slate-500">Payments</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(ledger.data.payments_total)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="text-xs text-slate-500">Allocated</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(ledger.data.allocated_total)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="text-xs text-slate-500">Outstanding</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(ledger.data.outstanding ?? ledger.data.balance)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="text-xs text-slate-500">Unallocated</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(ledger.data.unallocated)}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <RevenueByServicePanel
        params={{
          patient: patient || undefined,
          status: status || undefined,
          s: search || undefined,
        }}
      />

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Charges</h2>
          <p className="text-xs text-slate-500">
            Showing {results.length} of {count || 0}
          </p>
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-slate-500">Loading charges…</div>
        ) : error ? (
          <div className="p-4 text-sm text-rose-700">{error.message}</div>
        ) : results.length ? (
          <>
            {/* Mobile + tablet cards */}
            <div className="divide-y divide-slate-200 lg:hidden">
              {results.map((c) => {
                const paid = Number(c.allocated_total || 0);
                const amt = Number(c.amount || 0);
                const outstanding = Math.max(amt - paid, 0);

                return (
                  <div key={c.id} className="p-4 text-xs text-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">#{c.id}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {fmtDate(c.created_at)}
                        </div>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {c.status}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="font-medium text-slate-900">
                        {c.patient_name || `Patient #${c.patient}`}
                      </div>
                      <div className="text-[11px] text-slate-500">ID: {c.patient}</div>
                    </div>

                    <div className="mt-3">
                      <div className="font-medium text-slate-900">
                        {c.service_name || c.service_code || "—"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.service_code}
                        {c.description ? ` • ${c.description}` : ""}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <div>
                        <div className="text-[11px] text-slate-500">Amount</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatMoney(amt)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Paid</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatMoney(paid)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Outstanding</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatMoney(outstanding)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-auto lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-700">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2 text-right">Outstanding</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.map((c) => {
                    const paid = Number(c.allocated_total || 0);
                    const amt = Number(c.amount || 0);
                    const outstanding = Math.max(amt - paid, 0);

                    return (
                      <tr key={c.id} className="text-xs text-slate-700">
                        <td className="px-3 py-2 font-medium text-slate-900">#{c.id}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">
                            {c.patient_name || `Patient #${c.patient}`}
                          </div>
                          <div className="text-[11px] text-slate-500">ID: {c.patient}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">
                            {c.service_name || c.service_code || "—"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {c.service_code}
                            {c.description ? ` • ${c.description}` : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatMoney(amt)}
                        </td>
                        <td className="px-3 py-2 text-right">{formatMoney(paid)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(outstanding)}</td>
                        <td className="px-3 py-2">{c.status}</td>
                        <td className="px-3 py-2">{fmtDate(c.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-4 text-sm text-slate-500">No charges found.</div>
        )}

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
        title="Record payment (Independent)"
      />
    </div>
  );
}
