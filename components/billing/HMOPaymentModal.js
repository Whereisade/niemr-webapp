// components/billing/HMOPaymentModal.js
"use client";

import { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
} from "lucide-react";

const PAYMENT_METHODS = [
  { value: "TRANSFER", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "POS", label: "POS" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "OTHER", label: "Other" },
];

function formatMoney(v) {
  if (v === null || v === undefined) return "₦0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₦${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function HMOPaymentModal({
  isOpen,
  onClose,
  hmo,
  outstandingBalance,
  onPaymentSuccess,
  onSubmit,
  isSubmitting,
}) {
  const [formData, setFormData] = useState({
    amount: "",
    method: "TRANSFER",
    reference: "",
    note: "",
    period_start: "",
    period_end: "",
    auto_allocate: true,
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: "",
        method: "TRANSFER",
        reference: "",
        note: "",
        period_start: "",
        period_end: "",
        auto_allocate: true,
      });
      setErrors({});
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Suggest full outstanding amount as default
  useEffect(() => {
    if (isOpen && outstandingBalance && !formData.amount) {
      setFormData((prev) => ({
        ...prev,
        amount: String(outstandingBalance),
      }));
    }
  }, [isOpen, outstandingBalance, formData.amount]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || Number(formData.amount) <= 0) {
      newErrors.amount = "Amount must be greater than zero";
    }

    if (!formData.method) {
      newErrors.method = "Payment method is required";
    }

    if (formData.period_start && formData.period_end) {
      if (new Date(formData.period_start) > new Date(formData.period_end)) {
        newErrors.period_end = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit({
        hmo_id: hmo.id,
        ...formData,
      });

      // Show success message
      setShowSuccess(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      }, 2000);
    } catch (err) {
      // Error handling is done by the parent component
      console.error("Payment submission error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Record HMO Payment</h2>
                <p className="text-sm text-slate-600">{hmo?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mx-6 mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900">Payment Recorded Successfully!</p>
                <p className="text-sm text-emerald-700">
                  Payment has been allocated to outstanding charges.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Outstanding Balance Info */}
        {outstandingBalance > 0 && !showSuccess && (
          <div className="mx-6 mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Outstanding Balance</p>
                <p className="text-2xl font-bold text-amber-700">
                  {formatMoney(outstandingBalance)}
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  This amount will be suggested as the payment amount
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!showSuccess && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Amount */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Payment Amount <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-3 text-slate-400">₦</div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full rounded-xl border ${
                    errors.amount ? "border-rose-300" : "border-slate-200"
                  } bg-white pl-8 pr-4 py-3 text-lg font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 flex items-center gap-1 text-sm text-rose-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.amount}
                </p>
              )}
              {outstandingBalance > 0 && formData.amount && (
                <p className="mt-1 text-xs text-slate-500">
                  {Number(formData.amount) >= outstandingBalance
                    ? "✓ Full payment - will clear all outstanding charges"
                    : `Partial payment - ₦${(outstandingBalance - Number(formData.amount)).toFixed(2)} will remain outstanding`}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.method}
                onChange={(e) => handleChange("method", e.target.value)}
                disabled={isSubmitting}
                className={`w-full rounded-xl border ${
                  errors.method ? "border-rose-300" : "border-slate-200"
                } bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50`}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
              {errors.method && (
                <p className="mt-1 flex items-center gap-1 text-sm text-rose-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.method}
                </p>
              )}
            </div>

            {/* Reference */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Payment Reference
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleChange("reference", e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                placeholder="e.g., HMO-JAN-2025-001"
              />
              <p className="mt-1 text-xs text-slate-500">
                Transaction ID, receipt number, or internal reference
              </p>
            </div>

            {/* Billing Period */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Period Start
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => handleChange("period_start", e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Period End
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => handleChange("period_end", e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full rounded-xl border ${
                      errors.period_end ? "border-rose-300" : "border-slate-200"
                    } bg-white pl-10 pr-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50`}
                  />
                </div>
                {errors.period_end && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    {errors.period_end}
                  </p>
                )}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Notes (Optional)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => handleChange("note", e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                placeholder="Additional information about this payment..."
              />
            </div>

            {/* Auto-allocation Option */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.auto_allocate}
                  onChange={(e) => handleChange("auto_allocate", e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">Auto-allocate to charges</div>
                  <p className="mt-1 text-sm text-slate-600">
                    Automatically allocate this payment to the oldest unpaid charges for patients
                    under this HMO. If unchecked, the payment will be recorded but not allocated.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}