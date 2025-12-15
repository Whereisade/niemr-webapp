// components/labs/LabOrderDetailsModal.js
"use client";

import { useEffect, useState } from "react";
import { fetchLabOrderById } from "@/lib/labsDetails";
import {
  Beaker,
  X,
  AlertTriangle,
  Loader2,
  UserRound,
  Activity,
  Clock,
  FileText,
} from "lucide-react";
import { getLabStatusMeta } from "@/lib/LabsUiConfig";

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

function priorityPillClasses(priority) {
  const p = String(priority || "").toUpperCase();
  const map = {
    STAT: "bg-rose-50 text-rose-700 ring-rose-200",
    URGENT: "bg-amber-50 text-amber-700 ring-amber-200",
    ROUTINE: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return map[p] || "bg-slate-50 text-slate-700 ring-slate-200";
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
            err?.message ||
              "Failed to load lab order details. Please try again."
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const priorityLabel = order?.priority || "—";
  const { label: statusLabel, badgeClass } = getLabStatusMeta(order?.status);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-4 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/20">
        {/* Header */}
        <div className="relative border-b border-slate-200/80">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
                <Beaker className="h-4 w-4 text-slate-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Lab order details
                </h2>
                {order?.id && (
                  <p className="text-xs text-slate-500">
                    Order ID: <span className="font-mono">{order.id}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              Loading lab order…
            </div>
          )}

          {error && (
            <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {order && !loading && !error && (
            <>
              {/* Summary grid */}
              <section className="grid gap-3 md:grid-cols-2">
                {/* Patient */}
                <SummaryCard
                  label="Patient"
                  icon={UserRound}
                  value={order.patient_name || order.patient || "—"}
                />

                {/* Status */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-md bg-white border border-slate-200">
                        <Activity className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${badgeClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* Priority */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-md bg-white border border-slate-200">
                        <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Priority
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${priorityPillClasses(
                        order.priority
                      )}`}
                    >
                      {priorityLabel}
                    </span>
                  </div>
                </div>

                {/* Ordered at */}
                <SummaryCard
                  label="Ordered at"
                  icon={Clock}
                  value={
                    formatDateTime(order.ordered_at || order.created_at) || "—"
                  }
                />
              </section>

              {/* Tests */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-50 border border-slate-200">
                    <Beaker className="h-3.5 w-3.5 text-slate-600" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tests ordered
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pulled directly from the lab order items.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {testsDisplay && testsDisplay !== "—" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {testsDisplay.split(",").map((t, idx) => (
                        <span
                          key={`${t}-${idx}`}
                          className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-800 ring-1 ring-slate-200"
                        >
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No tests listed.</p>
                  )}
                </div>
              </section>

              {/* Clinical note */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-50 border border-slate-200">
                    <FileText className="h-3.5 w-3.5 text-slate-600" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Clinical note
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Shared with the lab team to provide context.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">
                    {order.note || "No clinical notes provided."}
                  </p>
                </div>
              </section>

              {/* Future placeholder for results */}
              <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] text-slate-500">
                Result values and attachments can be displayed here when the
                order is reported.
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── UI helpers ─────────────── */

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-white border border-slate-200">
          <Icon className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-0.5 text-xs text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}
