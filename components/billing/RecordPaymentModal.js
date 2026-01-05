"use client";

import { useEffect, useMemo, useState } from "react";
import { X, CreditCard, Loader2, RefreshCcw, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PatientDropdown from "@/components/billing/PatientDropdown";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (typeof payload === "object") {
    const keys = Object.keys(payload).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    if (keys.length) return keys.map((k) => payload[k]);
  }
  return [];
}

function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function RecordPaymentModal({
  open,
  onClose,
  onSaved,
  defaultPatientId,
  title = "Record Payment",
}) {
  const [mode, setMode] = useState("AUTO");
  const [patientId, setPatientId] = useState(defaultPatientId ? String(defaultPatientId) : "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const [charges, setCharges] = useState([]);
  const [allocMap, setAllocMap] = useState({});
  const [loadingCharges, setLoadingCharges] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canLoadCharges = open && mode === "ALLOCATE" && String(patientId || "").length;

  useEffect(() => {
    if (!open) {
      setSuccess(false);
      return;
    }

    setError("");
    if (defaultPatientId) setPatientId(String(defaultPatientId));
  }, [open, defaultPatientId]);

  const loadCharges = async () => {
    if (!patientId) return;
    setLoadingCharges(true);
    setError("");
    try {
      const payload = await apiFetch(`/billing/charges/?patient=${encodeURIComponent(patientId)}`, {
        method: "GET",
      });
      const rows = normalizeList(payload);

      const filtered = rows
        .map((c) => {
          const allocated = safeNum(c.allocated_total);
          const amt = safeNum(c.amount);
          const outstanding = Math.max(amt - allocated, 0);
          return { ...c, outstanding };
        })
        .filter((c) => c.status !== "VOID" && c.outstanding > 0.0001);

      setCharges(filtered);

      const next = {};
      filtered.forEach((c) => {
        next[c.id] = String(c.outstanding.toFixed(2));
      });
      setAllocMap(next);
    } catch (e) {
      setError(e?.message || "Failed to load charges");
    } finally {
      setLoadingCharges(false);
    }
  };

  useEffect(() => {
    if (!canLoadCharges) return;
    loadCharges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadCharges]);

  const allocations = useMemo(() => {
    if (mode !== "ALLOCATE") return [];
    return Object.entries(allocMap)
      .map(([charge_id, amt]) => ({
        charge_id,
        amount: amt,
      }))
      .filter((a) => safeNum(a.amount) > 0);
  }, [allocMap, mode]);

  const allocationsTotal = useMemo(() => {
    return allocations.reduce((sum, a) => sum + safeNum(a.amount), 0);
  }, [allocations]);

  const suggestedAmount = mode === "ALLOCATE" ? allocationsTotal : safeNum(amount);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const submit = async () => {
    setError("");
    setSuccess(false);

    if (!patientId) {
      setError("Patient is required.");
      return;
    }

    const finalAmount =
      mode === "ALLOCATE"
        ? (amount ? safeNum(amount) : allocationsTotal)
        : safeNum(amount);

    if (!finalAmount || finalAmount <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    const payload = {
      patient: Number(patientId),
      amount: finalAmount,
      method,
      reference,
      note,
    };

    if (mode === "ALLOCATE" && allocations.length) {
      payload.allocations = allocations.map((a) => ({
        charge_id: Number(a.charge_id),
        amount: safeNum(a.amount),
      }));
    }

    setSaving(true);
    try {
      await apiFetch("/billing/payments/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(true);
      setTimeout(() => {
        onSaved?.();
        onClose?.();
      }, 1000);
    } catch (e) {
      setError(e?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-2xl shadow-slate-900/30">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-200/80">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-5" />
          <div className="relative flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                <p className="text-xs text-slate-600">
                  {mode === "AUTO" ? "Auto-allocate to oldest charges" : "Manual allocation to specific charges"}
                </p>
              </div>
            </div>

            <button
              onClick={() => onClose?.()}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Success Message */}
          {success && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-emerald-900">Payment recorded successfully!</div>
                <div className="text-xs text-emerald-700">Redirecting...</div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !success && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <div className="flex-1 text-sm text-rose-800">{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Column - Payment Details */}
            <div className="space-y-4 lg:col-span-1">
              {/* Mode Selection */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Allocation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("AUTO")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-semibold transition ${
                      mode === "AUTO"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <TrendingUp className="h-5 w-5" />
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("ALLOCATE")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-semibold transition ${
                      mode === "ALLOCATE"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Manual
                  </button>
                </div>
              </div>

              {/* Patient Selection */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Patient *
                </label>
                <PatientDropdown
                  value={patientId}
                  onChange={setPatientId}
                  placeholder="Select patient…"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Amount {mode === "ALLOCATE" && <span className="text-slate-500">(Optional)</span>}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-sm font-semibold text-slate-500">₦</span>
                  </div>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={mode === "ALLOCATE" ? formatMoney(suggestedAmount) : "0.00"}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                {mode === "ALLOCATE" && allocationsTotal > 0 && (
                  <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <span className="font-semibold">Allocations total:</span> {formatMoney(allocationsTotal)}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {["CASH", "CARD", "POS", "TRANSFER", "CHEQUE", "INSURANCE", "OTHER"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Reference Number
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Receipt #, POS ref, etc."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Note */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional payment note…"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Right Column - Allocation Details */}
            <div className="lg:col-span-2">
              {mode === "AUTO" ? (
                <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8">
                  <div className="text-center">
                    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100">
                      <TrendingUp className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">Automatic Allocation</h3>
                    <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-600">
                      Payment will be automatically allocated to the oldest unpaid charges for this patient within your billing scope.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {/* Allocation Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Allocate to Charges</h3>
                      <p className="text-xs text-slate-600">
                        Specify amount per charge • Total: <span className="font-semibold text-emerald-700">{formatMoney(allocationsTotal)}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={loadCharges}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      disabled={loadingCharges || !patientId}
                    >
                      {loadingCharges ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Refresh
                    </button>
                  </div>

                  {/* Charges List */}
                  {loadingCharges ? (
                    <div className="flex flex-1 items-center justify-center p-8">
                      <div className="text-center">
                        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-slate-400" />
                        <p className="text-sm text-slate-500">Loading charges…</p>
                      </div>
                    </div>
                  ) : charges.length ? (
                    <div className="flex-1 overflow-auto">
                      <table className="min-w-full">
                        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur">
                          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            <th className="px-4 py-3">Charge</th>
                            <th className="px-4 py-3 text-right">Outstanding</th>
                            <th className="px-4 py-3 text-right">Allocate Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {charges.map((c) => (
                            <tr key={c.id} className="transition hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">
                                  {c.service_name || c.service_code || "Service"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  #{c.id} {c.description && `• ${c.description}`}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="font-semibold text-slate-900">
                                  {formatMoney(c.outstanding)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="relative inline-block">
                                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                                    <span className="text-xs font-semibold text-slate-500">₦</span>
                                  </div>
                                  <input
                                    value={allocMap[c.id] ?? ""}
                                    onChange={(e) =>
                                      setAllocMap((m) => ({ ...m, [c.id]: e.target.value }))
                                    }
                                    placeholder="0.00"
                                    className="w-32 rounded-lg border border-slate-200 bg-white py-1.5 pl-6 pr-2 text-right text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-8">
                      <div className="text-center">
                        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                          <AlertCircle className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="mb-1 text-sm font-semibold text-slate-900">No outstanding charges</h3>
                        <p className="text-sm text-slate-500">
                          This patient has no unpaid charges in your scope.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={saving || success}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-60"
              disabled={saving || success}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recording…
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Recorded!
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}