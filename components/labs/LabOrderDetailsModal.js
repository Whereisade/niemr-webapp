// components/labs/LabOrderDetailsModal.js
"use client";

import { useEffect, useState } from "react";
import { fetchLabOrderById } from "@/lib/labsDetails";

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

export default function LabOrderDetailsModal({ orderId, onClose, open }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !orderId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchLabOrderById(orderId);
        if (cancelled) return;
        setOrder(res);
      } catch (err) {
        console.error("Failed to load lab order details", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load lab order details. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  if (!open) return null;

  const testsDisplay = order
    ? Array.isArray(order.items)
      ? order.items
          .map(
            (i) =>
              i.test?.name ||
              i.test?.code ||
              i.test_name ||
              i.code
          )
          .join(", ")
      : order.tests_display || "—"
    : "—";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Lab order details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {loading && (
            <p className="text-slate-500">Loading lab order…</p>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {order && !loading && !error && (
            <>
              {/* Top summary */}
              <div className="space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Patient
                  </span>
                  <span className="text-right text-sm text-slate-900">
                    {order.patient_name || order.patient || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  <span className="text-right text-sm text-slate-900">
                    {order.status || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Priority
                  </span>
                  <span className="text-right text-sm text-slate-900">
                    {order.priority || "—"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Ordered at
                  </span>
                  <span className="text-right text-sm text-slate-900">
                    {formatDateTime(order.ordered_at)}
                  </span>
                </div>
              </div>

              {/* Tests */}
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tests
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                  {testsDisplay || "—"}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Clinical note
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 whitespace-pre-wrap">
                  {order.note || "—"}
                </div>
              </div>

              {/* Optional future: results */}
              {/* If later the backend adds result_text / result_values, we can render them here. */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
