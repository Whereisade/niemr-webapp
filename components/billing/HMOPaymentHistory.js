// components/billing/HMOPaymentHistory.js
"use client";

import { useState, useMemo } from "react";
import {
  CreditCard,
  Calendar,
  FileText,
  TrendingUp,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";

function formatMoney(v) {
  if (v === null || v === undefined) return "₦0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₦${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function formatDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

const PAYMENT_METHOD_LABELS = {
  TRANSFER: "Bank Transfer",
  CASH: "Cash",
  POS: "POS",
  CARD: "Card",
  CHEQUE: "Cheque",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

function PaymentRow({ payment, onExpand, isExpanded }) {
  const allocationCount = payment.allocations?.length || 0;
  const isFullyAllocated = Number(payment.unallocated_total || 0) <= 0.01;

  return (
    <>
      <tr
        onClick={() => onExpand(payment.id)}
        className="cursor-pointer transition hover:bg-slate-50"
      >
        <td className="px-4 py-3">
          <div className="font-medium text-slate-900">
            {formatDateTime(payment.received_at)}
          </div>
          <div className="text-xs text-slate-500">
            by {payment.received_by_name || `User #${payment.received_by}`}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-slate-900">
            {PAYMENT_METHOD_LABELS[payment.method] || payment.method}
          </div>
          {payment.reference && (
            <div className="text-xs text-slate-500">Ref: {payment.reference}</div>
          )}
        </td>
        <td className="px-4 py-3">
          {payment.period_start && payment.period_end ? (
            <div className="text-sm text-slate-700">
              {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
            </div>
          ) : (
            <div className="text-xs text-slate-400">No period</div>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="font-bold text-slate-900">{formatMoney(payment.amount)}</div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="font-semibold text-emerald-700">
            {formatMoney(payment.allocated_total)}
          </div>
          <div className="text-xs text-slate-500">{allocationCount} charges</div>
        </td>
        <td className="px-4 py-3 text-right">
          <div
            className={`font-semibold ${
              isFullyAllocated ? "text-slate-400" : "text-amber-700"
            }`}
          >
            {formatMoney(payment.unallocated_total)}
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              isFullyAllocated
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {isFullyAllocated ? "Fully Allocated" : "Partial"}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onExpand(payment.id);
            }}
          >
            {isExpanded ? "Hide" : "View"} Details
          </button>
        </td>
      </tr>

      {/* Expanded allocation details */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="bg-slate-50 px-4 py-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">Payment Allocations</h4>
                {payment.note && (
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Note:</span> {payment.note}
                  </div>
                )}
              </div>

              {allocationCount > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="px-3 py-2">Patient</th>
                        <th className="px-3 py-2">Service</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Amount Allocated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payment.allocations.map((alloc, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {alloc.patient_name || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {alloc.charge_service_code}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {alloc.charge_description || "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            {formatMoney(alloc.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                  <p className="text-sm text-slate-600">No allocations for this payment</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function HMOPaymentHistory({ payments, isLoading, error }) {
  const [expandedPaymentId, setExpandedPaymentId] = useState(null);

  const toggleExpand = (paymentId) => {
    setExpandedPaymentId((prev) => (prev === paymentId ? null : paymentId));
  };

  const summary = useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        total: 0,
        allocated: 0,
        unallocated: 0,
      };
    }

    return payments.reduce(
      (acc, payment) => ({
        total: acc.total + Number(payment.amount || 0),
        allocated: acc.allocated + Number(payment.allocated_total || 0),
        unallocated: acc.unallocated + Number(payment.unallocated_total || 0),
      }),
      { total: 0, allocated: 0, unallocated: 0 }
    );
  }, [payments]);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-12 text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">Loading payment history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-rose-600" />
          <div>
            <p className="font-semibold text-rose-900">Failed to load payment history</p>
            <p className="text-sm text-rose-700">
              {error?.message || "Unknown error occurred"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Payment History</h2>
            <p className="text-xs text-slate-600">{payments?.length || 0} payment(s)</p>
          </div>
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            title="Export payments"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>

        {/* Summary Cards */}
        {payments && payments.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div className="text-xs font-medium text-slate-600">Total Received</div>
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {formatMoney(summary.total)}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <div className="text-xs font-medium text-emerald-700">Allocated</div>
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-900">
                {formatMoney(summary.allocated)}
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                <div className="text-xs font-medium text-amber-700">Unallocated</div>
              </div>
              <div className="mt-1 text-lg font-bold text-amber-900">
                {formatMoney(summary.unallocated)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Table */}
      <div className="overflow-auto">
        {payments && payments.length > 0 ? (
          <table className="min-w-full">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Allocated</th>
                <th className="px-4 py-3 text-right">Unallocated</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  onExpand={toggleExpand}
                  isExpanded={expandedPaymentId === payment.id}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No payments recorded</p>
            <p className="mt-1 text-xs text-slate-500">
              Payments from this HMO will appear here once recorded
            </p>
          </div>
        )}
      </div>
    </div>
  );
}