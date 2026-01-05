// app/facility/billing/patients/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useCharges } from "@/lib/useCharges";
import { usePayments } from "@/lib/usePayments";
import { useBillingLedger } from "@/lib/useBillingLedger";
import RecordPaymentModal from "@/components/billing/RecordPaymentModal";
import {
  Users,
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Wallet,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  BarChart3,
  Download,
  Loader2,
} from "lucide-react";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (typeof payload === "object") {
    const keys = Object.keys(payload).filter((k) => /^\d+$/.test(k));
    if (keys.length) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => payload[k]);
    }
  }
  return [];
}

function normalizeResults(payload) {
  if (!payload) return { count: 0, results: [] };
  if (Array.isArray(payload.results)) return payload;
  if (Array.isArray(payload)) return { count: payload.length, results: payload };
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

function PatientFinancialRow({ patient, onSelect, isExpanded }) {
  const ledger = useBillingLedger(
    { patient: patient.id },
    { enabled: !!patient.id }
  );

  const outstanding = Number(ledger.data?.outstanding || 0);
  const chargesTotal = Number(ledger.data?.charges_total || 0);
  const paymentsTotal = Number(ledger.data?.payments_total || 0);
  
  const hasBalance = outstanding > 0.01;

  return (
    <tr 
      onClick={() => onSelect(patient)}
      className="group cursor-pointer transition hover:bg-slate-50"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <div>
            <div className="font-semibold text-slate-900">
              {patient.first_name} {patient.last_name}
            </div>
            <div className="text-xs text-slate-500">ID: {patient.id}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-slate-600">{patient.email || "—"}</div>
      </td>
      <td className="px-4 py-4 text-right">
        {ledger.isLoading ? (
          <div className="flex items-center justify-end gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
            <span className="text-xs text-slate-500">Loading...</span>
          </div>
        ) : (
          <div className="font-semibold text-slate-900">{formatMoney(chargesTotal)}</div>
        )}
      </td>
      <td className="px-4 py-4 text-right">
        {ledger.isLoading ? (
          <div className="flex items-center justify-end gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="font-semibold text-emerald-700">{formatMoney(paymentsTotal)}</div>
        )}
      </td>
      <td className="px-4 py-4 text-right">
        {ledger.isLoading ? (
          <div className="flex items-center justify-end gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className={`font-bold ${hasBalance ? "text-rose-700" : "text-emerald-700"}`}>
            {formatMoney(outstanding)}
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        {ledger.isLoading ? null : hasBalance ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle className="h-3 w-3" />
            Has Balance
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Cleared
          </div>
        )}
      </td>
    </tr>
  );
}

function PatientFinancialDetail({ patient, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const ledger = useBillingLedger({ patient: patient.id }, { enabled: true });
  
  const chargesParams = useMemo(() => ({
    patient: patient.id,
    page: 1,
    limit: 100,
  }), [patient.id]);
  
  const paymentsParams = useMemo(() => ({
    patient: patient.id,
    page: 1,
    limit: 100,
  }), [patient.id]);

  const charges = useCharges(chargesParams);
  const payments = usePayments(paymentsParams);

  const chargesList = normalizeResults(charges.data).results;
  const paymentsList = normalizeResults(payments.data).results;

  const onPaymentSaved = () => {
    ledger.mutate?.();
    charges.mutate?.();
    payments.mutate?.();
  };

  return (
    <tr>
      <td colSpan={6} className="bg-slate-50/50 p-0">
        <div className="space-y-4 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold">
                {patient.first_name?.[0]}{patient.last_name?.[0]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {patient.first_name} {patient.last_name}
                </h3>
                <p className="text-sm text-slate-600">
                  Complete financial history for this patient
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <DollarSign className="h-4 w-4" />
                Record Payment
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Total Charges
                </div>
                <Receipt className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {formatMoney(ledger.data?.charges_total || 0)}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Payments
                </div>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-900">
                {formatMoney(ledger.data?.payments_total || 0)}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Allocated
                </div>
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatMoney(ledger.data?.allocated_total || 0)}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                  Outstanding
                </div>
                <AlertCircle className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-rose-900">
                {formatMoney(ledger.data?.outstanding || ledger.data?.balance || 0)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "overview"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("charges")}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "charges"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Charges ({chargesList.length})
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "payments"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Payments ({paymentsList.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Activity Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <h4 className="text-sm font-semibold text-slate-900">Activity Summary</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Total Transactions</span>
                        <span className="font-semibold text-slate-900">
                          {chargesList.length + paymentsList.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Total Charges</span>
                        <span className="font-semibold text-slate-900">{chargesList.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Total Payments</span>
                        <span className="font-semibold text-slate-900">{paymentsList.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      <h4 className="text-sm font-semibold text-slate-900">Payment Status</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-600">Collection Rate</span>
                          <span className="font-semibold text-slate-900">
                            {ledger.data?.charges_total > 0
                              ? Math.round((ledger.data?.payments_total / ledger.data?.charges_total) * 100)
                              : 0}%
                          </span>
                        </div>
                        <ProgressBar
                          value={Number(ledger.data?.payments_total || 0)}
                          max={Number(ledger.data?.charges_total || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-900">Recent Activity</h4>
                  <div className="space-y-2">
                    {[...chargesList, ...paymentsList]
                      .sort((a, b) => {
                        const dateA = new Date(a.created_at || a.received_at);
                        const dateB = new Date(b.created_at || b.received_at);
                        return dateB - dateA;
                      })
                      .slice(0, 5)
                      .map((item, idx) => {
                        const isCharge = !!item.service_name;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`grid h-8 w-8 place-items-center rounded-lg ${
                                isCharge ? "bg-blue-100" : "bg-emerald-100"
                              }`}>
                                {isCharge ? (
                                  <Receipt className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Wallet className="h-4 w-4 text-emerald-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {isCharge ? (item.service_name || "Charge") : "Payment"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {fmtDate(item.created_at || item.received_at)}
                                </div>
                              </div>
                            </div>
                            <div className={`text-sm font-bold ${
                              isCharge ? "text-slate-900" : "text-emerald-700"
                            }`}>
                              {isCharge ? "+" : "-"}{formatMoney(item.amount)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "charges" && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {charges.isLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : chargesList.length > 0 ? (
                  <div className="overflow-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          <th className="px-4 py-3">Charge</th>
                          <th className="px-4 py-3">Service</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {chargesList.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">#{c.id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">
                                {c.service_name || c.service_code}
                              </div>
                              {c.description && (
                                <div className="text-xs text-slate-500">{c.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-semibold text-slate-900">{formatMoney(c.amount)}</div>
                              <div className="text-xs text-slate-500">
                                Paid: {formatMoney(c.allocated_total || 0)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={c.status} />
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {fmtDate(c.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No charges found for this patient
                  </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {payments.isLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : paymentsList.length > 0 ? (
                  <div className="overflow-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          <th className="px-4 py-3">Payment</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentsList.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">#{p.id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-slate-900">{p.method}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-semibold text-emerald-700">
                                {formatMoney(p.amount)}
                              </div>
                              <div className="text-xs text-slate-500">
                                Allocated: {formatMoney(p.allocated_total || 0)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-slate-900">{p.reference || "—"}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {fmtDate(p.received_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No payments found for this patient
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <RecordPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSaved={onPaymentSaved}
          defaultPatientId={patient.id}
          title="Record Payment"
        />
      </td>
    </tr>
  );
}

export default function PatientFinancialHistoryPage() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPatientId, setExpandedPatientId] = useState(null);

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        setError("");
        const res = await apiFetch("/patients/?page=1&limit=200");
        const items = normalizeList(res);
        setPatients(items);
      } catch (err) {
        console.error("Failed to load patients", err);
        setError(err?.message || "Failed to load patients");
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    
    const query = searchTerm.toLowerCase();
    return patients.filter((p) => {
      const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const id = String(p.id);
      
      return fullName.includes(query) || email.includes(query) || id.includes(query);
    });
  }, [patients, searchTerm]);

  const handlePatientSelect = (patient) => {
    if (expandedPatientId === patient.id) {
      setExpandedPatientId(null);
    } else {
      setExpandedPatientId(patient.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/30 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <button
            onClick={() => router.push("/facility/billing")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Billing
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Patient Financial History</h1>
                  <p className="text-sm text-slate-600">
                    View complete financial records for all patients
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patients by name, email, or ID..."
                className="flex-1 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Patients Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Patients ({filteredPatients.length})
                </h2>
                <p className="text-xs text-slate-600">
                  Click on a patient to view their complete financial history
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="text-sm text-slate-500">Loading patients...</p>
            </div>
          ) : filteredPatients.length > 0 ? (
            <div className="overflow-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-right">Total Charges</th>
                    <th className="px-4 py-3 text-right">Total Payments</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((patient) => (
                    <>
                      <PatientFinancialRow
                        key={patient.id}
                        patient={patient}
                        onSelect={handlePatientSelect}
                        isExpanded={expandedPatientId === patient.id}
                      />
                      {expandedPatientId === patient.id && (
                        <PatientFinancialDetail
                          patient={patient}
                          onClose={() => setExpandedPatientId(null)}
                        />
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No patients found</h3>
              <p className="text-sm text-slate-500">
                {searchTerm ? "Try adjusting your search" : "No patients registered yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}