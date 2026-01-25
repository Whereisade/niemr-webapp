"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pill,
  X,
  Clock,
  User,
  Building2,
  Stethoscope,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingDown,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

/**
 * Enhanced prescription details modal with better UX and stock integration.
 *
 * Props:
 * - open: boolean
 * - id: prescription ID
 * - onClose: () => void
 * - allowDispense?: boolean (default false)
 * - onUpdated?: () => void  // called after successful dispense
 */
export default function PrescriptionDetailsModal({
  open,
  onClose,
  id,
  allowDispense = false,
  onUpdated,
}) {
  const [rx, setRx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stock data
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);

  // Dispense UI state
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [dispenseForms, setDispenseForms] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [submitErrors, setSubmitErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState({});

  // Prescribed quantity editing
  const [editingPrescribedId, setEditingPrescribedId] = useState(null);
  const [prescribedForms, setPrescribedForms] = useState({});
  const [updatingPrescribed, setUpdatingPrescribed] = useState(null);

  // Load prescription
  useEffect(() => {
    if (!open || !id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setRx(null);
      setSubmitErrors({});
      setSubmitSuccess({});
      setExpandedItemId(null);
      setEditingPrescribedId(null);

      try {
        const res = await fetch(`/api/proxy/pharmacy/prescriptions/${id}/`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error(`Failed to load prescription (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) {
          setRx(json);
          // Initialize forms
          const forms = {};
          const prescribedFormsInit = {};
          if (json.items) {
            json.items.forEach((item) => {
              forms[item.id] = { qty: "", note: "" };
              prescribedFormsInit[item.id] = { qty: item.qty_prescribed || "" };
            });
          }
          setDispenseForms(forms);
          setPrescribedForms(prescribedFormsInit);
        }
      } catch (err) {
        console.error("Failed to load prescription details:", err);
        if (!cancelled) {
          setError(err.message || "Failed to load details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, id]);

  // Load stock when modal opens and user can dispense
  useEffect(() => {
    if (!open || !allowDispense) return;

    let cancelled = false;

    async function loadStock() {
      setStockLoading(true);
      try {
        const res = await fetch("/api/proxy/pharmacy/stock/", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load stock");
        const json = await res.json();
        if (!cancelled) {
          const stockList = Array.isArray(json)
            ? json
            : Array.isArray(json.results)
            ? json.results
            : [];
          setStock(stockList);
        }
      } catch (err) {
        console.error("Failed to load stock:", err);
        if (!cancelled) setStock([]);
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    }

    loadStock();
    return () => {
      cancelled = true;
    };
  }, [open, allowDispense]);

  // Stock lookup map
  const stockByDrugId = useMemo(() => {
    const m = new Map();
    for (const s of stock) {
      const drug = s.drug || {};
      if (drug.id != null) {
        m.set(drug.id, s.current_qty ?? 0);
      }
    }
    return m;
  }, [stock]);

  // Items with remaining quantity
  const itemsWithRemaining = useMemo(() => {
    if (!rx || !Array.isArray(rx.items)) return [];
    return rx.items
      .map((item) => {
        const prescribed = item.qty_prescribed ?? 0;
        const dispensed = item.qty_dispensed ?? 0;
        const remaining = Math.max(0, prescribed - dispensed);
        const stockQty = item.drug?.id
          ? stockByDrugId.get(item.drug.id) ?? null
          : null;

        return { ...item, _remaining: remaining, _stockQty: stockQty };
      })
      .filter((item) => item._remaining > 0);
  }, [rx, stockByDrugId]);

  async function handleDispenseSubmit(itemId) {
    setSubmitErrors((prev) => ({ ...prev, [itemId]: null }));
    setSubmitSuccess((prev) => ({ ...prev, [itemId]: "" }));

    if (!allowDispense || !rx || !id) return;

    const form = dispenseForms[itemId];
    if (!form) return;

    const numericQty = Number(form.qty);
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      setSubmitErrors((prev) => ({
        ...prev,
        [itemId]: "Enter a valid quantity to dispense.",
      }));
      return;
    }

    const targetItem = itemsWithRemaining.find((it) => it.id === itemId);
    if (!targetItem) {
      setSubmitErrors((prev) => ({
        ...prev,
        [itemId]: "Item is no longer available for dispense.",
      }));
      return;
    }

    if (numericQty > targetItem._remaining) {
      setSubmitErrors((prev) => ({
        ...prev,
        [itemId]: `Cannot dispense more than remaining (${targetItem._remaining}).`,
      }));
      return;
    }

    try {
      setSubmitting(itemId);
      const res = await fetch(
        `/api/proxy/pharmacy/prescriptions/${id}/dispense/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            item_id: itemId,
            qty: numericQty,
            note: form.note || "",
          }),
        }
      );

      if (!res.ok) {
        let msg = `Failed to dispense (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson && (errJson.detail || errJson.error)) {
            msg = errJson.detail || errJson.error;
          }
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const updated = await res.json();
      setRx(updated);

      // Reset form
      setDispenseForms((prev) => ({
        ...prev,
        [itemId]: { qty: "", note: "" },
      }));

      setSubmitSuccess((prev) => ({
        ...prev,
        [itemId]: `Successfully dispensed ${numericQty} unit${
          numericQty > 1 ? "s" : ""
        }.`,
      }));

      // Collapse the item after successful dispense
      setTimeout(() => {
        setExpandedItemId(null);
        setSubmitSuccess((prev) => ({ ...prev, [itemId]: "" }));
      }, 2000);

      if (typeof onUpdated === "function") {
        onUpdated();
      }
    } catch (err) {
      console.error("Dispense failed:", err);
      setSubmitErrors((prev) => ({
        ...prev,
        [itemId]: err.message || "Failed to record dispense.",
      }));
    } finally {
      setSubmitting(null);
    }
  }

  function updateDispenseForm(itemId, updates) {
    setDispenseForms((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...updates },
    }));
  }

  function updatePrescribedForm(itemId, updates) {
    setPrescribedForms((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...updates },
    }));
  }

  async function handleUpdatePrescribed(itemId) {
    setSubmitErrors((prev) => ({ ...prev, [itemId]: null }));
    setSubmitSuccess((prev) => ({ ...prev, [itemId]: "" }));

    if (!allowDispense || !rx || !id) return;

    const form = prescribedForms[itemId];
    if (!form) return;

    const numericQty = Number(form.qty);
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      setSubmitErrors((prev) => ({
        ...prev,
        [itemId]: "Enter a valid prescribed quantity.",
      }));
      return;
    }

    try {
      setUpdatingPrescribed(itemId);
      const res = await fetch(
        `/api/proxy/pharmacy/prescriptions/${id}/update-item/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            item_id: itemId,
            qty_prescribed: numericQty,
          }),
        }
      );

      if (!res.ok) {
        let msg = `Failed to update prescribed quantity (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson && (errJson.detail || errJson.error)) {
            msg = errJson.detail || errJson.error;
          }
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const updated = await res.json();
      setRx(updated);

      setSubmitSuccess((prev) => ({
        ...prev,
        [itemId]: `Prescribed quantity updated to ${numericQty}.`,
      }));

      // Close the editing form after success
      setTimeout(() => {
        setEditingPrescribedId(null);
        setSubmitSuccess((prev) => ({ ...prev, [itemId]: "" }));
      }, 2000);

      if (typeof onUpdated === "function") {
        onUpdated();
      }
    } catch (err) {
      console.error("Update prescribed quantity failed:", err);
      setSubmitErrors((prev) => ({
        ...prev,
        [itemId]: err.message || "Failed to update prescribed quantity.",
      }));
    } finally {
      setUpdatingPrescribed(null);
    }
  }

  if (!open || !id) return null;

  const status = String(rx?.status || "").toUpperCase();
  const createdAt = rx ? formatDateTime(rx.created_at) : "—";
  const canDispense =
    allowDispense &&
    (status === "PRESCRIBED" || status === "PARTIALLY_DISPENSED");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 to-indigo-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-600">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Prescription Details
              </div>
              <div className="text-lg font-bold text-slate-900">#{id}</div>
            </div>
            <StatusBadge value={status} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading prescription details…
            </div>
          )}

          {error && !loading && (
            <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {!loading && !error && rx && (
            <div className="space-y-6 p-6">
              {/* Overview Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  icon={Clock}
                  label="Created"
                  value={createdAt}
                  iconBg="bg-slate-50"
                  iconColor="text-slate-600"
                />
                <InfoCard
                  icon={User}
                  label="Patient"
                  value={
                    rx.patient_name || `Patient #${rx.patient}` || "Unknown"
                  }
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <InfoCard
                  icon={Building2}
                  label="Facility"
                  value={
                    rx.facility_name ||
                    (rx.facility ? `Facility #${rx.facility}` : "—")
                  }
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
                />
                <InfoCard
                  icon={Stethoscope}
                  label="Prescribed by"
                  value={
                    rx.prescribed_by_name ||
                    (rx.prescribed_by ? `User #${rx.prescribed_by}` : "—")
                  }
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <InfoCard
                  icon={FileText}
                  label="Encounter ID"
                  value={rx.encounter_id ? `#${rx.encounter_id}` : "—"}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                />
              </div>

              {/* Clinical Notes */}
              {rx.note && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Clinical Notes
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {rx.note}
                  </p>
                </div>
              )}

              {/* Medications */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Medications{" "}
                    <span className="text-slate-500">
                      ({rx.items?.length || 0})
                    </span>
                  </div>
                  {stockLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading stock…
                    </div>
                  )}
                </div>

                {Array.isArray(rx.items) && rx.items.length ? (
                  <div className="space-y-3">
                    {rx.items.map((item) => {
                      const drug = item.drug || {};
                      const name =
                        drug.name ||
                        drug.code ||
                        item.drug_name ||
                        item.dose ||
                        "Medication";

                      const prescribed = item.qty_prescribed ?? 0;
                      const dispensed = item.qty_dispensed ?? 0;
                      const remaining = Math.max(0, prescribed - dispensed);
                      const stockQty = drug.id
                        ? stockByDrugId.get(drug.id)
                        : null;

                      const isFullyDispensed = remaining === 0 && prescribed > 0;
                      const noPrescribedQty = prescribed === 0;
                      const isExpanded = expandedItemId === item.id;
                      const isEditingPrescribed = editingPrescribedId === item.id;
                      const hasStockIssue =
                        stockQty !== null &&
                        remaining > 0 &&
                        stockQty < remaining;
                      const isOutOfStock =
                        stockQty !== null && stockQty === 0 && remaining > 0;

                      return (
                        <div
                          key={item.id}
                          className={`overflow-hidden rounded-xl border ${
                            noPrescribedQty
                              ? "border-blue-200 bg-blue-50/30"
                              : isFullyDispensed
                              ? "border-emerald-200 bg-emerald-50/30"
                              : isOutOfStock
                              ? "border-rose-200 bg-rose-50/30"
                              : hasStockIssue
                              ? "border-amber-200 bg-amber-50/30"
                              : "border-slate-200 bg-white"
                          } shadow-sm transition`}
                        >
                          {/* Item Header */}
                          <div className="flex items-start justify-between gap-3 p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-slate-900">
                                  {name}
                                </div>
                                {drug.strength && (
                                  <span className="text-xs text-slate-500">
                                    {drug.strength}
                                  </span>
                                )}
                                {drug.form && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                    {drug.form}
                                  </span>
                                )}
                              </div>

                              {/* Dosage info */}
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                                {item.dose && <span>• {item.dose}</span>}
                                {item.frequency && (
                                  <span>• {item.frequency}</span>
                                )}
                                {item.duration_days && (
                                  <span>• {item.duration_days} days</span>
                                )}
                              </div>

                              {item.instruction && (
                                <div className="mt-2 text-xs text-slate-700">
                                  <span className="font-medium">
                                    Instructions:
                                  </span>{" "}
                                  {item.instruction}
                                </div>
                              )}

                              {/* Quantity info */}
                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-slate-500">
                                    Prescribed:
                                  </span>
                                  <span className={`font-semibold ${noPrescribedQty ? 'text-blue-700' : 'text-slate-900'}`}>
                                    {prescribed || "Not set"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-slate-500">
                                    Dispensed:
                                  </span>
                                  <span className="font-semibold text-emerald-700">
                                    {dispensed}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-slate-500">
                                    Remaining:
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      remaining === 0
                                        ? "text-emerald-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {remaining}
                                  </span>
                                </div>
                                {stockQty !== null && (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Package className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-slate-500">
                                      In stock:
                                    </span>
                                    <span
                                      className={`font-semibold ${
                                        stockQty === 0
                                          ? "text-rose-700"
                                          : stockQty < remaining
                                          ? "text-amber-700"
                                          : "text-emerald-700"
                                      }`}
                                    >
                                      {stockQty}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Stock warnings */}
                              {noPrescribedQty && (
                                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Prescribed quantity not set
                                </div>
                              )}
                              {isOutOfStock && !noPrescribedQty && (
                                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-100 px-2 py-1 text-xs font-medium text-rose-800">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Out of stock - cannot dispense
                                </div>
                              )}
                              {hasStockIssue && !isOutOfStock && (
                                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                  <TrendingDown className="h-3.5 w-3.5" />
                                  Insufficient stock for full dispense
                                </div>
                              )}
                              {isFullyDispensed && (
                                <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Fully dispensed
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            {canDispense && (
                              <div className="flex flex-col gap-2">
                                {/* Set/Edit Prescribed Quantity button */}
                                {!isFullyDispensed && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPrescribedId(
                                        isEditingPrescribed ? null : item.id
                                      );
                                      // Close dispense form if open
                                      if (expandedItemId === item.id) {
                                        setExpandedItemId(null);
                                      }
                                      // Clear messages
                                      setSubmitErrors((prev) => ({ ...prev, [item.id]: null }));
                                      setSubmitSuccess((prev) => ({ ...prev, [item.id]: "" }));
                                    }}
                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                      isEditingPrescribed
                                        ? "border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        : noPrescribedQty
                                        ? "border border-blue-200 bg-blue-600 text-white hover:bg-blue-700"
                                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    {isEditingPrescribed ? (
                                      <>
                                        <ChevronUp className="h-4 w-4" />
                                        Cancel
                                      </>
                                    ) : noPrescribedQty ? (
                                      <>
                                        Set Qty
                                        <ChevronDown className="h-4 w-4" />
                                      </>
                                    ) : (
                                      <>
                                        Edit Qty
                                        <ChevronDown className="h-4 w-4" />
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* Dispense button - only show if prescribed qty is set */}
                                {!isFullyDispensed && !noPrescribedQty && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedItemId(
                                        isExpanded ? null : item.id
                                      );
                                      // Close prescribed editing form if open
                                      if (editingPrescribedId === item.id) {
                                        setEditingPrescribedId(null);
                                      }
                                      // Clear messages
                                      setSubmitErrors((prev) => ({ ...prev, [item.id]: null }));
                                      setSubmitSuccess((prev) => ({ ...prev, [item.id]: "" }));
                                    }}
                                    disabled={isOutOfStock}
                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                      isOutOfStock
                                        ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                                        : isExpanded
                                        ? "border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        : "border border-sky-200 bg-sky-600 text-white hover:bg-sky-700"
                                    }`}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-4 w-4" />
                                        Cancel
                                      </>
                                    ) : (
                                      <>
                                        Dispense
                                        <ChevronDown className="h-4 w-4" />
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Edit Prescribed Quantity Form */}
                          {canDispense && isEditingPrescribed && (
                            <div className="border-t border-slate-200 bg-blue-50 p-4">
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleUpdatePrescribed(item.id);
                                }}
                                className="space-y-3"
                              >
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-slate-700">
                                    Prescribed quantity{" "}
                                    <span className="text-rose-600">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={prescribedForms[item.id]?.qty || ""}
                                    onChange={(e) =>
                                      updatePrescribedForm(item.id, {
                                        qty: e.target.value,
                                      })
                                    }
                                    placeholder="Enter quantity prescribed"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                  <p className="mt-1 text-xs text-slate-600">
                                    Set the total quantity prescribed by the doctor
                                  </p>
                                </div>

                                {submitErrors[item.id] && (
                                  <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{submitErrors[item.id]}</span>
                                  </div>
                                )}

                                {submitSuccess[item.id] && (
                                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{submitSuccess[item.id]}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="submit"
                                    disabled={updatingPrescribed === item.id}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                                  >
                                    {updatingPrescribed === item.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Updating…
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        {noPrescribedQty ? "Set quantity" : "Update quantity"}
                                      </>
                                    )}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}

                          {/* Dispense Form */}
                          {canDispense && isExpanded && !isFullyDispensed && !noPrescribedQty && (
                            <div className="border-t border-slate-200 bg-slate-50 p-4">
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleDispenseSubmit(item.id);
                                }}
                                className="space-y-3"
                              >
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-700">
                                      Quantity to dispense{" "}
                                      <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={
                                        stockQty !== null
                                          ? Math.min(stockQty, remaining)
                                          : remaining
                                      }
                                      step={1}
                                      value={
                                        dispenseForms[item.id]?.qty || ""
                                      }
                                      onChange={(e) =>
                                        updateDispenseForm(item.id, {
                                          qty: e.target.value,
                                        })
                                      }
                                      placeholder={`Max: ${
                                        stockQty !== null
                                          ? Math.min(stockQty, remaining)
                                          : remaining
                                      }`}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-700">
                                      Note (optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        dispenseForms[item.id]?.note || ""
                                      }
                                      onChange={(e) =>
                                        updateDispenseForm(item.id, {
                                          note: e.target.value,
                                        })
                                      }
                                      placeholder="e.g. Issued for 5 days"
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    />
                                  </div>
                                </div>

                                {submitErrors[item.id] && (
                                  <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{submitErrors[item.id]}</span>
                                  </div>
                                )}

                                {submitSuccess[item.id] && (
                                  <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{submitSuccess[item.id]}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="submit"
                                    disabled={submitting === item.id}
                                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                                  >
                                    {submitting === item.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Recording…
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Record dispense
                                      </>
                                    )}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No medication items on this prescription.
                  </div>
                )}
              </div>

              {/* Dispense info for non-pharmacy users */}
              {!canDispense && allowDispense && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  This prescription can only be dispensed when status is{" "}
                  <strong>PRESCRIBED</strong> or{" "}
                  <strong>PARTIALLY_DISPENSED</strong>.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="text-xs text-slate-500">
            Prescription #{id} • {status || "Unknown status"}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── UI Components ─────────────── */

function InfoCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="truncate text-sm font-medium text-slate-900">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ value }) {
  const v = String(value || "").toUpperCase();
  const label =
    v === "PARTIALLY_DISPENSED"
      ? "Partially dispensed"
      : v === "PRESCRIBED"
      ? "Prescribed"
      : v === "DISPENSED"
      ? "Dispensed"
      : v === "DRAFT"
      ? "Draft"
      : v === "CANCELLED"
      ? "Cancelled"
      : v || "Unknown";

  let cls = "bg-slate-100 text-slate-700";
  if (v === "PRESCRIBED") {
    cls = "bg-sky-100 text-sky-800";
  } else if (v === "PARTIALLY_DISPENSED") {
    cls = "bg-amber-100 text-amber-800";
  } else if (v === "DISPENSED") {
    cls = "bg-emerald-100 text-emerald-800";
  } else if (v === "CANCELLED") {
    cls = "bg-rose-100 text-rose-800";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}