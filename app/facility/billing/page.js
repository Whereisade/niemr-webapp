"use client";

import { useMemo, useState } from "react";
import { useCharges } from "@/lib/useCharges";
import { useBillingLedger } from "@/lib/useBillingLedger";
import RevenueByServicePanel from "@/components/billing/RevenueByServicePanel";
import RecordPaymentModal from "@/components/billing/RecordPaymentModal";
import PatientDropdown from "@/components/billing/PatientDropdown";
import { 
  Receipt, 
  TrendingUp, 
  DollarSign, 
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Download
} from "lucide-react";

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

function StatusBadge({ status }) {
  const styles = {
    UNPAID: "bg-rose-50 text-rose-700 border-rose-200",
    PARTIALLY_PAID: "bg-amber-50 text-amber-700 border-amber-200",
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    VOID: "bg-slate-100 text-slate-500 border-slate-200"
  };

  const icons = {
    UNPAID: <XCircle className="h-3 w-3" />,
    PARTIALLY_PAID: <Clock className="h-3 w-3" />,
    PAID: <CheckCircle2 className="h-3 w-3" />,
    VOID: <AlertCircle className="h-3 w-3" />
  };

  const labels = {
    UNPAID: "Unpaid",
    PARTIALLY_PAID: "Partial",
    PAID: "Paid",
    VOID: "Void"
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.UNPAID}`}>
      {icons[status]}
      <span>{labels[status] || status}</span>
    </div>
  );
}

function ProgressBar({ value, max, className = "" }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  const colorClass = percentage >= 100 
    ? "bg-emerald-500" 
    : percentage > 0 
    ? "bg-amber-500" 
    : "bg-slate-200";

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div 
        className={`h-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
  { value: "VOID", label: "Void" },
];

export default function FacilityBillingPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [patient, setPatient] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

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

  const onPaymentSaved = () => {
    mutate?.();
    ledger.mutate?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/30 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Billing & Charges</h1>
                <p className="text-sm text-slate-600">
                  Manage patient charges and record payments
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
            >
              <DollarSign className="h-4 w-4" />
              Record Payment
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Search
                </label>
                <input
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  placeholder="Service code, name, or description…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Patient
                </label>
                <PatientDropdown
                  value={patient}
                  onChange={(val) => {
                    setPage(1);
                    setPatient(val);
                  }}
                  placeholder="All patients"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setPage(1);
                    setStatus(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Per page
                </label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Patient Ledger */}
        {ledgerEnabled && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-3">
              <h2 className="text-base font-semibold text-slate-900">Patient Ledger</h2>
              <p className="text-xs text-slate-600">Financial summary for selected patient</p>
            </div>
            
            {ledger.isLoading && !ledger.data ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Loading ledger…
              </div>
            ) : ledger.error ? (
              <div className="p-6">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {ledger.error.message}
                </div>
              </div>
            ) : ledger.data ? (
              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-5">
                <div className="group rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition hover:shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-600">Total Charges</div>
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {formatMoney(ledger.data.charges_total)}
                  </div>
                </div>

                <div className="group rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 transition hover:shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-emerald-700">Payments</div>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold text-emerald-900">
                    {formatMoney(ledger.data.payments_total)}
                  </div>
                </div>

                <div className="group rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 transition hover:shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-blue-700">Allocated</div>
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    {formatMoney(ledger.data.allocated_total)}
                  </div>
                </div>

                <div className="group rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 transition hover:shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-rose-700">Outstanding</div>
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="text-xl font-bold text-rose-900">
                    {formatMoney(ledger.data.outstanding ?? ledger.data.balance)}
                  </div>
                </div>

                <div className="group rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 transition hover:shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-amber-700">Unallocated</div>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold text-amber-900">
                    {formatMoney(ledger.data.unallocated)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Revenue Breakdown */}
        <RevenueByServicePanel
          params={{
            patient: patient || undefined,
            status: status || undefined,
            s: search || undefined,
          }}
        />

        {/* Charges Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Charges</h2>
              <p className="text-xs text-slate-600">
                {isLoading ? "Loading…" : `${results.length} of ${count || 0} charges`}
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
              <p className="text-sm text-slate-500">Loading charges…</p>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
                {error.message}
              </div>
            </div>
          ) : results.length ? (
            <div className="overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3">Charge</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((c) => {
                    const paid = Number(c.allocated_total || 0);
                    const amt = Number(c.amount || 0);
                    const outstanding = Math.max(amt - paid, 0);

                    return (
                      <tr key={c.id} className="group transition hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">#{c.id}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {c.patient_name || `Patient #${c.patient}`}
                          </div>
                          <div className="text-xs text-slate-500">ID: {c.patient}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {c.service_name || c.service_code || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.service_code}
                            {c.description && <span className="ml-1">• {c.description}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-semibold text-slate-900">{formatMoney(amt)}</div>
                          <div className="text-xs text-slate-500">
                            Paid: {formatMoney(paid)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-[160px]">
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">{formatMoney(paid)}</span>
                              <span className="text-slate-500">{formatMoney(amt)}</span>
                            </div>
                            <ProgressBar value={paid} max={amt} />
                            {outstanding > 0 && (
                              <div className="mt-1 text-xs text-amber-700">
                                Due: {formatMoney(outstanding)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          {fmtDate(c.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                <Receipt className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No charges found</h3>
              <p className="text-sm text-slate-500">
                Try adjusting your filters or create a new charge
              </p>
            </div>
          )}

          {/* Pagination */}
          {results.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-5 py-4">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
                <span className="font-semibold text-slate-900">
                  {count ? Math.ceil(count / limit) : 1}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={count ? page >= Math.ceil(count / limit) : results.length < limit}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <RecordPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSaved={onPaymentSaved}
        defaultPatientId={patient || undefined}
        title="Record Payment"
      />
    </div>
  );
}