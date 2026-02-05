"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCharges } from "@/lib/useCharges";
import { usePayments } from "@/lib/usePayments";
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
  Download,
  Users,
  Settings2,
  Shield,
  User,
  Building2,
  Wallet,
  CreditCard,
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

function PaymentSourceBadge({ source }) {
  const configs = {
    PATIENT_DIRECT: {
      icon: <User className="h-3 w-3" />,
      label: "Patient Direct",
      style: "bg-blue-50 text-blue-700 border-blue-200"
    },
    HMO: {
      icon: <Shield className="h-3 w-3" />,
      label: "HMO",
      style: "bg-purple-50 text-purple-700 border-purple-200"
    },
    INSURANCE: {
      icon: <Building2 className="h-3 w-3" />,
      label: "Insurance",
      style: "bg-indigo-50 text-indigo-700 border-indigo-200"
    },
    CORPORATE: {
      icon: <Building2 className="h-3 w-3" />,
      label: "Corporate",
      style: "bg-cyan-50 text-cyan-700 border-cyan-200"
    },
    OTHER: {
      icon: <Wallet className="h-3 w-3" />,
      label: "Other",
      style: "bg-slate-50 text-slate-700 border-slate-200"
    }
  };

  const config = configs[source] || configs.OTHER;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.style}`}>
      {config.icon}
      <span>{config.label}</span>
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

const PAYMENT_SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "PATIENT_DIRECT", label: "Patient Direct" },
  { value: "HMO", label: "HMO" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "All methods" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "POS", label: "POS" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "OTHER", label: "Other" },
];

export default function FacilityBillingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("charges"); // "charges" | "payments"
  
  // Charges state
  const [chargesPage, setChargesPage] = useState(1);
  const [chargesLimit, setChargesLimit] = useState(20);
  const [chargesPatient, setChargesPatient] = useState("");
  const [chargesStatus, setChargesStatus] = useState("");
  const [chargesSearch, setChargesSearch] = useState("");
  
  // Payments state
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLimit, setPaymentsLimit] = useState(20);
  const [paymentsPatient, setPaymentsPatient] = useState("");
  const [paymentsSource, setPaymentsSource] = useState("");
  const [paymentsMethod, setPaymentsMethod] = useState("");
  const [paymentsSearch, setPaymentsSearch] = useState("");
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const chargesParams = useMemo(
    () => ({
      page: chargesPage,
      limit: chargesLimit,
      patient: chargesPatient || undefined,
      status: chargesStatus || undefined,
      s: chargesSearch || undefined,
    }),
    [chargesPage, chargesLimit, chargesPatient, chargesStatus, chargesSearch]
  );

  const paymentsParams = useMemo(
    () => ({
      page: paymentsPage,
      limit: paymentsLimit,
      patient: paymentsPatient || undefined,
      payment_source: paymentsSource || undefined,
      method: paymentsMethod || undefined,
      s: paymentsSearch || undefined,
    }),
    [paymentsPage, paymentsLimit, paymentsPatient, paymentsSource, paymentsMethod, paymentsSearch]
  );

  const { data: chargesData, error: chargesError, isLoading: chargesLoading, mutate: mutateCharges } = useCharges(chargesParams);
  const { count: chargesCount, results: charges } = normalizeResults(chargesData);

  const { data: paymentsData, error: paymentsError, isLoading: paymentsLoading, mutate: mutatePayments } = usePayments(paymentsParams);
  const { count: paymentsCount, results: payments } = normalizeResults(paymentsData);

  // Calculate payment summary statistics
  const paymentSummary = useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        totalReceived: 0,
        patientDirect: 0,
        hmo: 0,
        other: 0,
      };
    }

    return payments.reduce((acc, p) => {
      const amount = Number(p.amount || 0);
      acc.totalReceived += amount;

      switch (p.payment_source) {
        case "PATIENT_DIRECT":
          acc.patientDirect += amount;
          break;
        case "HMO":
          acc.hmo += amount;
          break;
        default:
          acc.other += amount;
      }

      return acc;
    }, {
      totalReceived: 0,
      patientDirect: 0,
      hmo: 0,
      other: 0,
    });
  }, [payments]);

  const ledgerEnabled = Boolean(chargesPatient);
  const ledger = useBillingLedger(
    chargesPatient ? { patient: chargesPatient } : {},
    { enabled: ledgerEnabled }
  );

  const onPaymentSaved = () => {
    mutateCharges?.();
    mutatePayments?.();
    ledger.mutate?.();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/30 p-4 sm:p-6">
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

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Hide" : "Show"} Filters
            </button>
            <button
              onClick={() => router.push('/facility/appointments/pricing')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
            >
              <Settings2 className="h-4 w-4" />
              Services Pricing
            </button>
            <button
              onClick={() => router.push('/facility/billing/patients')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
            >
              <Users className="h-4 w-4" />
              Patient History
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 sm:w-auto"
            >
              <DollarSign className="h-4 w-4" />
              Record Payment
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:flex-row sm:items-center">
          <button
            onClick={() => setActiveTab("charges")}
            className={`flex w-full flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
              activeTab === "charges"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Charges
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
              {chargesCount || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex w-full flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
              activeTab === "payments"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Payments
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
              {paymentsCount || 0}
            </span>
          </button>
        </div>

        {/* Filters - Charges */}
        {showFilters && activeTab === "charges" && (
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
                  value={chargesSearch}
                  onChange={(e) => {
                    setChargesPage(1);
                    setChargesSearch(e.target.value);
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
                  value={chargesPatient}
                  onChange={(val) => {
                    setChargesPage(1);
                    setChargesPatient(val);
                  }}
                  placeholder="All patients"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Status
                </label>
                <select
                  value={chargesStatus}
                  onChange={(e) => {
                    setChargesPage(1);
                    setChargesStatus(e.target.value);
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
                  value={chargesLimit}
                  onChange={(e) => {
                    setChargesPage(1);
                    setChargesLimit(Number(e.target.value));
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

        {/* Filters - Payments */}
        {showFilters && activeTab === "payments" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Search
                </label>
                <input
                  value={paymentsSearch}
                  onChange={(e) => {
                    setPaymentsPage(1);
                    setPaymentsSearch(e.target.value);
                  }}
                  placeholder="Reference number…"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Patient
                </label>
                <PatientDropdown
                  value={paymentsPatient}
                  onChange={(val) => {
                    setPaymentsPage(1);
                    setPaymentsPatient(val);
                  }}
                  placeholder="All patients"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Payment Source
                </label>
                <select
                  value={paymentsSource}
                  onChange={(e) => {
                    setPaymentsPage(1);
                    setPaymentsSource(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {PAYMENT_SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Payment Method
                </label>
                <select
                  value={paymentsMethod}
                  onChange={(e) => {
                    setPaymentsPage(1);
                    setPaymentsMethod(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
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
                  value={paymentsLimit}
                  onChange={(e) => {
                    setPaymentsPage(1);
                    setPaymentsLimit(Number(e.target.value));
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

        {/* Payment Summary Stats */}
        {activeTab === "payments" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5 transition hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">
                  <DollarSign className="h-5 w-5 text-blue-700" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-900">{formatMoney(paymentSummary.totalReceived)}</div>
              <div className="text-xs font-medium text-blue-700">Total Received</div>
            </div>

            <div className="group rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 transition hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100">
                  <User className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-900">{formatMoney(paymentSummary.patientDirect)}</div>
              <div className="text-xs font-medium text-emerald-700">Patient Direct</div>
            </div>

            <div className="group rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 transition hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-100">
                  <Shield className="h-5 w-5 text-purple-700" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-900">{formatMoney(paymentSummary.hmo)}</div>
              <div className="text-xs font-medium text-purple-700">HMO Payments</div>
            </div>

            <div className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 transition hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">
                  <Wallet className="h-5 w-5 text-slate-700" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatMoney(paymentSummary.other)}</div>
              <div className="text-xs font-medium text-slate-700">Other Sources</div>
            </div>
          </div>
        )}

        {/* Patient Ledger */}
        {ledgerEnabled && activeTab === "charges" && (
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
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
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
        {activeTab === "charges" && (
          <RevenueByServicePanel
            params={{
              patient: chargesPatient || undefined,
              status: chargesStatus || undefined,
              s: chargesSearch || undefined,
            }}
          />
        )}

        {/* Charges Table */}
        {activeTab === "charges" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Charges</h2>
                <p className="text-xs text-slate-600">
                  {chargesLoading ? "Loading…" : `${charges.length} of ${chargesCount || 0} charges`}
                </p>
              </div>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>

            {chargesLoading ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                <p className="text-sm text-slate-500">Loading charges…</p>
              </div>
            ) : chargesError ? (
              <div className="p-6">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
                  {chargesError.message}
                </div>
              </div>
            ) : charges.length ? (
              <>
                <div className="space-y-3 p-4 lg:hidden">
                  {charges.map((c) => {
                    const paid = Number(c.allocated_total || 0);
                    const amt = Number(c.amount || 0);
                    const outstanding = Math.max(amt - paid, 0);

                    return (
                      <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Charge #{c.id}</div>
                            <div className="text-xs text-slate-500">{fmtDate(c.created_at)}</div>
                          </div>
                          <StatusBadge status={c.status} />
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</div>
                            <div className="text-sm font-medium text-slate-900">
                              {c.patient_name || `Patient #${c.patient}`}
                            </div>
                            <div className="text-xs text-slate-500">ID: {c.patient}</div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service</div>
                            <div className="text-sm font-medium text-slate-900">
                              {c.service_name || c.service_code || "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {c.service_code}
                              {c.description && <span className="ml-1">- {c.description}</span>}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</div>
                              <div className="text-sm font-semibold text-slate-900">{formatMoney(amt)}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Paid</div>
                              <div className="text-sm font-semibold text-emerald-700">{formatMoney(paid)}</div>
                            </div>
                          </div>

                          <div>
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
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-auto lg:block">
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
                    {charges.map((c) => {
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
              </>
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
            {charges.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  Page <span className="font-semibold text-slate-900">{chargesPage}</span> of{" "}
                  <span className="font-semibold text-slate-900">
                    {chargesCount ? Math.ceil(chargesCount / chargesLimit) : 1}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    onClick={() => setChargesPage((p) => Math.max(1, p - 1))}
                    disabled={chargesPage <= 1}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setChargesPage((p) => p + 1)}
                    disabled={chargesCount ? chargesPage >= Math.ceil(chargesCount / chargesLimit) : charges.length < chargesLimit}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payments Table */}
        {activeTab === "payments" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Payment Transactions</h2>
                <p className="text-xs text-slate-600">
                  {paymentsLoading ? "Loading…" : `${payments.length} of ${paymentsCount || 0} payments`}
                </p>
              </div>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>

            {paymentsLoading ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                <p className="text-sm text-slate-500">Loading payments…</p>
              </div>
            ) : paymentsError ? (
              <div className="p-6">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
                  {paymentsError.message}
                </div>
              </div>
            ) : payments.length ? (
              <>
                <div className="space-y-3 p-4 lg:hidden">
                  {payments.map((p) => {
                    const isHMO = p.payment_source === "HMO";
                    const displayName = isHMO
                      ? p.hmo_name || "HMO"
                      : p.patient_name || `Patient #${p.patient}`;

                    return (
                      <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Payment #{p.id}</div>
                            <div className="text-xs text-slate-500">{fmtDate(p.received_at)}</div>
                          </div>
                          <PaymentSourceBadge source={p.payment_source} />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            {isHMO ? (
                              <Shield className="h-4 w-4 text-purple-600" />
                            ) : (
                              <User className="h-4 w-4 text-blue-600" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-slate-900">{displayName}</div>
                              {isHMO && (
                                <div className="text-xs font-medium text-purple-600">Bulk Payment</div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Method</div>
                              <div className="text-sm font-medium text-slate-900">{p.method || "-"}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference</div>
                              <div className="truncate text-sm font-medium text-slate-900">{p.reference || "-"}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</div>
                              <div className="text-sm font-semibold text-slate-900">{formatMoney(p.amount)}</div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Allocated</div>
                              <div className="text-sm font-semibold text-emerald-700">{formatMoney(p.allocated_total || 0)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-auto lg:block">
                  <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-4 py-3">Payment ID</th>
                      <th className="px-4 py-3">Payer</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Allocated</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => {
                      const isHMO = p.payment_source === "HMO";
                      const displayName = isHMO 
                        ? p.hmo_name || "HMO" 
                        : p.patient_name || `Patient #${p.patient}`;
                      
                      return (
                        <tr key={p.id} className="group transition hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">#{p.id}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {isHMO ? (
                                <Shield className="h-4 w-4 text-purple-600" />
                              ) : (
                                <User className="h-4 w-4 text-blue-600" />
                              )}
                              <div>
                                <div className="font-medium text-slate-900">{displayName}</div>
                                {isHMO && (
                                  <div className="text-xs text-purple-600 font-medium">Bulk Payment</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-slate-700">{p.method}</div>
                          </td>
                          <td className="px-4 py-4">
                            <PaymentSourceBadge source={p.payment_source} />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="font-semibold text-slate-900">{formatMoney(p.amount)}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="font-semibold text-emerald-700">{formatMoney(p.allocated_total || 0)}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-slate-700">{p.reference || "—"}</div>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-600">
                            {fmtDate(p.received_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                  <CreditCard className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-slate-900">No payments found</h3>
                <p className="text-sm text-slate-500">
                  Try adjusting your filters or record a new payment
                </p>
              </div>
            )}

            {/* Pagination */}
            {payments.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  Page <span className="font-semibold text-slate-900">{paymentsPage}</span> of{" "}
                  <span className="font-semibold text-slate-900">
                    {paymentsCount ? Math.ceil(paymentsCount / paymentsLimit) : 1}
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                    disabled={paymentsPage <= 1}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPaymentsPage((p) => p + 1)}
                    disabled={paymentsCount ? paymentsPage >= Math.ceil(paymentsCount / paymentsLimit) : payments.length < paymentsLimit}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <RecordPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSaved={onPaymentSaved}
        defaultPatientId={chargesPatient || paymentsPatient || undefined}
        title="Record Payment"
      />
    </div>
  );
}
