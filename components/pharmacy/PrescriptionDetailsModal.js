"use client";

import { useEffect, useMemo, useState } from "react";
import { Pill, X, Clock } from "lucide-react";

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
 * Shared prescription details modal.
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

  // dispense form state
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    if (!open || !id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setRx(null);
      setSubmitError(null);
      setSubmitSuccess("");
      try {
        const res = await fetch(`/api/proxy/pharmacy/prescriptions/${id}/`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          throw new Error(`Failed to load prescription (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) {
          setRx(json);
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

  // pick items that still have remaining quantity
  const itemsWithRemaining = useMemo(() => {
    if (!rx || !Array.isArray(rx.items)) return [];
    return rx.items
      .map((item) => {
        const prescribed = item.qty_prescribed ?? 0;
        const dispensed = item.qty_dispensed ?? 0;
        const remaining = Math.max(0, prescribed - dispensed);
        return { ...item, _remaining: remaining };
      })
      .filter((item) => item._remaining > 0);
  }, [rx]);

  const status = String(rx?.status || "").toUpperCase();
  const createdAt = rx ? formatDateTime(rx.created_at) : "—";

  // initialise selected item when data loads
  useEffect(() => {
    if (!allowDispense) return;
    if (!rx || !Array.isArray(rx.items) || !rx.items.length) return;

    const firstWithRemaining = itemsWithRemaining[0];
    if (firstWithRemaining) {
      setSelectedItemId(firstWithRemaining.id);
    } else {
      setSelectedItemId(null);
    }
    setQty("");
    setNote("");
    setSubmitError(null);
    setSubmitSuccess("");
  }, [rx, allowDispense, itemsWithRemaining]);

  async function handleDispenseSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess("");

    if (!allowDispense) return;
    if (!rx || !id) return;

    const itemId = selectedItemId;
    if (!itemId) {
      setSubmitError("Select a medication to dispense.");
      return;
    }

    const numericQty = Number(qty);
    if (!Number.isFinite(numericQty) || numericQty <= 0) {
      setSubmitError("Enter a valid quantity to dispense.");
      return;
    }

    const targetItem = itemsWithRemaining.find((it) => it.id === itemId);
    if (!targetItem) {
      setSubmitError("Selected medication is no longer available for dispense.");
      return;
    }

    if (numericQty > targetItem._remaining) {
      setSubmitError(
        `Cannot dispense more than remaining (${targetItem._remaining}).`
      );
      return;
    }

    try {
      setSubmitting(true);
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
            note: note || "",
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
      setQty("");
      setNote("");
      setSubmitSuccess("Dispense recorded successfully.");

      if (typeof onUpdated === "function") {
        onUpdated();
      }
    } catch (err) {
      console.error("Dispense failed:", err);
      setSubmitError(err.message || "Failed to record dispense.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !id) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* header bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50">
              <Pill className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Prescription details
              </div>
              <div className="text-sm font-medium text-slate-900">#{id}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* content */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-sm text-slate-800">
          {loading && (
            <div className="py-6 text-sm text-slate-500">
              Loading prescription…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}

          {!loading && !error && rx && (
            <>
              {/* Top meta */}
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Overview
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {createdAt}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Status:{" "}
                    <strong className="font-semibold">
                      {status || "Unknown"}
                    </strong>
                  </div>
                  <div className="text-xs text-slate-600">
                    Patient:{" "}
                    <span className="font-medium">
                      {rx.patient_name || `Patient #${rx.patient}` || "—"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Facility:{" "}
                    <span className="font-medium">
                      {rx.facility_name || (rx.facility ? `Facility #${rx.facility}` : "—")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Prescribed by:{" "}
                    <span className="font-medium">
                      {rx.prescribed_by_name || (rx.prescribed_by ? `User #${rx.prescribed_by}` : "—")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Encounter ID:{" "}
                    <span className="font-medium">
                      {rx.encounter_id ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </div>
                  {rx.note ? (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {rx.note}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No additional note recorded.
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="mt-2 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Medications
                </div>
                {Array.isArray(rx.items) && rx.items.length ? (
                  <ul className="space-y-2">
                    {rx.items.map((item) => {
                      const drug = item.drug || {};
                      const name =
                        drug.name || drug.code || item.dose || "Medication";

                      const prescribed = item.qty_prescribed ?? 0;
                      const dispensed = item.qty_dispensed ?? 0;
                      const remaining = Math.max(0, prescribed - dispensed);

                      const dose = item.dose || "";
                      const freq = item.frequency || "";
                      const duration = item.duration_days
                        ? `${item.duration_days} days`
                        : "";

                      return (
                        <li
                          key={item.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">
                              {name}
                              {drug.strength && (
                                <span className="ml-1 text-xs font-normal text-slate-600">
                                  ({drug.strength})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Rx item #{item.id}
                            </div>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                            {dose && <span>• {dose}</span>}
                            {freq && <span>• {freq}</span>}
                            {duration && <span>• {duration}</span>}
                            <span>
                              • Qty dispensed:{" "}
                              <span className="font-medium">
                                {dispensed} / {prescribed}
                              </span>
                            </span>
                            <span>• Remaining: {remaining}</span>
                          </div>

                          {item.instruction && (
                            <p className="mt-1 text-[11px] text-slate-700">
                              Instruction: {item.instruction}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">
                    No medication items on this prescription.
                  </p>
                )}
              </div>

              {/* Dispense panel (facility pharmacists only) */}
              {allowDispense && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Record dispense
                  </div>

                  {status === "CANCELLED" || status === "DRAFT" ? (
                    <div className="text-[11px] text-slate-500">
                      This prescription is not active. Only prescriptions with
                      status <strong>PRESCRIBED</strong> or{" "}
                      <strong>PARTIALLY_DISPENSED</strong> can be dispensed.
                    </div>
                  ) : itemsWithRemaining.length === 0 ? (
                    <div className="text-[11px] text-slate-500">
                      All items on this prescription appear fully dispensed.
                    </div>
                  ) : (
                    <form
                      onSubmit={handleDispenseSubmit}
                      className="space-y-2 text-[11px]"
                    >
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-700">
                            Medication
                          </label>
                          <select
                            value={selectedItemId ?? ""}
                            onChange={(e) =>
                              setSelectedItemId(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="">
                              Select an item to dispense…
                            </option>
                            {itemsWithRemaining.map((it) => {
                              const drug = it.drug || {};
                              const name =
                                drug.name ||
                                drug.code ||
                                it.dose ||
                                "Medication";
                              return (
                                <option key={it.id} value={it.id}>
                                  {name} · Remaining {it._remaining}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-700">
                            Quantity to dispense
                          </label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-700">
                          Note (optional)
                        </label>
                        <textarea
                          rows={2}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="e.g. Issued 10 tablets for 5 days supply"
                        />
                      </div>

                      {submitError && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
                          {submitError}
                        </div>
                      )}
                      {submitSuccess && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                          {submitSuccess}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
                        >
                          {submitting ? "Saving…" : "Record dispense"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}