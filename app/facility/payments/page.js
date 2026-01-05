"use client";

import { useMemo, useState } from "react";
import { usePayments } from "@/lib/usePayments";
import RecordPaymentModal from "@/components/billing/RecordPaymentModal";
import PatientDropdown from "@/components/billing/PatientDropdown";
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Download,
  Filter,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle2,
  AlertCircle,
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

function PaymentMethodBadge({ method }) {
  const config = {
    CASH: { icon: Banknote, color: "emerald", label: "Cash" },
    CARD: { icon: CreditCard, color: "blue", label: "Card" },
    POS: { icon: CreditCard, color: "purple", label: "POS" },
    TRANSFER: { icon: Building2, color: "indigo", label: "Transfer" },
    CHEQUE: { icon: Building2, color: "cyan", label: "Cheque" },
    INSURANCE: { icon: Building2, color: "violet", label: "Insurance" },
    OTHER: { icon: DollarSign, color: "slate", label: "Other" },
  };

  const { icon: Icon, color, label } = config[method] || config.OTHER;

  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClasses[color]}`}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}

function AllocationStatus({ allocated, total }) {
  const percentage = total > 0 ? (allocated / total) * 100 : 0;
  const isFullyAllocated = percentage >= 100;
  const hasUnallocated = percentage < 100 && allocated > 0;

  return (
    <div className="flex items-center gap-2">
      {isFullyAllocated ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : hasUnallocated ? (
        <AlertCircle className="h-4 w-4 text-amber-600" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
      )}
      <div className="flex-1">
        <div className="text-xs font-medium text-slate-700">
          {formatMoney(allocated)} / {formatMoney(total)}
        </div>
        <div className="mt-0.5 h-1 w-24 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all ${isFullyAllocated ? "bg-emerald-500" : hasUnallocated ? "bg-amber-500" : "bg-slate-300"}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function FacilityPaymentsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [patient, setPatient] = useState("");
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

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

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!results.length) return { total: 0, allocated: 0, unallocated: 0 };
    
    return results.reduce((acc, p) => ({
      total: acc.total + Number(p.amount || 0),
      allocated: acc.allocated + Number(p.allocated_total || 0),
      unallocated: acc.unallocated + Number(p.unallocated_total || 0),
    }), { total: 0, allocated: 0, unallocated: 0 });
  }, [results]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/30 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
                <p className="text-sm text-slate-600">
                  Track and manage all payment transactions
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
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
            >
              <DollarSign className="h-4 w-4" />
              Record Payment
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="group rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Total Received
                </div>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatMoney(summary.total)}
              </div>
              <div className="mt-2 text-xs text-blue-600">
                From {results.length} payment{results.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="group rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Allocated
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-900">
                {formatMoney(summary.allocated)}
              </div>
              <div className="mt-2 text-xs text-emerald-600">
                {summary.total > 0 ? Math.round((summary.allocated / summary.total) * 100) : 0}% of total
              </div>
            </div>

            <div className="group rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Unallocated
                </div>
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-900">
                {formatMoney(summary.unallocated)}
              </div>
              <div className="mt-2 text-xs text-amber-600">
                Available for allocation
              </div>
            </div>
          </div>
        )}

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
                  placeholder="Reference number, note…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => {
                    setPage(1);
                    setMethod(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All methods</option>
                  {["CASH", "CARD", "POS", "TRANSFER", "CHEQUE", "INSURANCE", "OTHER"].map((m) => (
                    <option key={m} value={m}>
                      {m}
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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

        {/* Payments Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Payment Transactions</h2>
              <p className="text-xs text-slate-600">
                {isLoading ? "Loading…" : `${results.length} of ${count || 0} payments`}
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="text-sm text-slate-500">Loading payments…</p>
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
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Allocation</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((p) => (
                    <tr key={p.id} className="group transition hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">#{p.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {p.patient_name || `Patient #${p.patient}`}
                        </div>
                        <div className="text-xs text-slate-500">ID: {p.patient}</div>
                      </td>
                      <td className="px-4 py-4">
                        <PaymentMethodBadge method={p.method} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-slate-900">{formatMoney(p.amount)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <AllocationStatus
                          allocated={Number(p.allocated_total || 0)}
                          total={Number(p.amount || 0)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[200px]">
                          {p.reference ? (
                            <div className="truncate font-medium text-slate-900">{p.reference}</div>
                          ) : (
                            <div className="text-slate-400">—</div>
                          )}
                          {p.note && <div className="truncate text-xs text-slate-500">{p.note}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        {fmtDate(p.received_at)}
                        {p.received_by_name && (
                          <div className="mt-0.5 text-slate-500">by {p.received_by_name}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                <Wallet className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No payments found</h3>
              <p className="text-sm text-slate-500">
                Try adjusting your filters or record a new payment
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
        onSaved={onSaved}
        defaultPatientId={patient || undefined}
        title="Record Payment"
      />
    </div>
  );
}