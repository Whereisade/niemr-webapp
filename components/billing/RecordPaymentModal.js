"use client";

import { useEffect, useMemo, useState } from "react";
import { X, CreditCard, Loader2, RefreshCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PatientDropdown from "@/components/billing/PatientDropdown";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  // numeric-key object fallback
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
  title = "Record payment",
}) {
  const [mode, setMode] = useState("AUTO"); // AUTO | ALLOCATE
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

  const canLoadCharges = open && mode === "ALLOCATE" && String(patientId || "").length;

  useEffect(() => {
    if (!open) return;

    // reset on open
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

      // only show unpaid-ish
      const filtered = rows
        .map((c) => {
          const allocated = safeNum(c.allocated_total);
          const amt = safeNum(c.amount);
          const outstanding = Math.max(amt - allocated, 0);
          return { ...c, outstanding };
        })
        .filter((c) => c.status !== "VOID" && c.outstanding > 0.0001);

      setCharges(filtered);

      // default allocations: fill outstanding
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

      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="relative border-b border-slate-200/80">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
                <CreditCard className="h-4 w-4 text-slate-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                <p className="text-xs text-slate-500">
                  Auto-allocate, or allocate against specific charges.
                </p>
              </div>
            </div>

            <button
              onClick={() => onClose?.()}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Mode</label>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("AUTO")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      mode === "AUTO"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("ALLOCATE")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      mode === "ALLOCATE"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Allocate
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Patient</label>
                <PatientDropdown
                  value={patientId}
                  onChange={setPatientId}
                  placeholder="Select patient…"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">
                  Amount {mode === "ALLOCATE" ? "(optional)" : ""}
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={mode === "ALLOCATE" ? `e.g. ${formatMoney(suggestedAmount)}` : "e.g. 5000"}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
                {mode === "ALLOCATE" ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Leave empty to use allocations total:{" "}
                    <span className="font-semibold text-slate-700">{formatMoney(allocationsTotal)}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  >
                    {["CASH", "POS", "TRANSFER", "CARD", "CHEQUE", "OTHER"].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Reference</label>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Receipt / POS ref"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700">Note</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              {mode === "AUTO" ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Auto allocation</h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Payment will be auto-allocated to the oldest unpaid charges for this patient (within your scope).
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Allocate to charges</h3>
                      <p className="text-xs text-slate-500">
                        Enter amounts per charge. Total:{" "}
                        <span className="font-semibold text-slate-700">{formatMoney(allocationsTotal)}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={loadCharges}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      disabled={loadingCharges || !patientId}
                    >
                      {loadingCharges ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      Refresh
                    </button>
                  </div>

                  {loadingCharges ? (
                    <div className="p-4 text-sm text-slate-500">Loading charges…</div>
                  ) : charges.length ? (
                    <div className="max-h-[360px] overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-700">
                          <tr>
                            <th className="px-3 py-2">Charge</th>
                            <th className="px-3 py-2 text-right">Outstanding</th>
                            <th className="px-3 py-2 text-right">Allocate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {charges.map((c) => (
                            <tr key={c.id} className="text-xs text-slate-700">
                              <td className="px-3 py-2">
                                <div className="font-medium text-slate-900">
                                  {c.service_name || c.service_code || "Service"}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  #{c.id} • {c.description || "—"}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {formatMoney(c.outstanding)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  value={allocMap[c.id] ?? ""}
                                  onChange={(e) =>
                                    setAllocMap((m) => ({ ...m, [c.id]: e.target.value }))
                                  }
                                  className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-xs outline-none focus:border-slate-400"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-slate-500">
                      No outstanding charges found for this patient (in your scope).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Record payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}