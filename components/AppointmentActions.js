"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AppointmentActions({ id, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function doAction(action) {
    setBusy(true);
    try {
      const r = await fetch(`/api/proxy/appointments/${id}/${action}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `Failed: ${action}`);
      }
      setToast({ ok: true, text: `Success: ${action.replace("_", " ")}` });
      router.refresh();
    } catch (e) {
      setToast({ ok: false, text: e?.message || "Action failed" });
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy;
  const s = String(status || "").toLowerCase();

  const canCheckIn  = !disabled && ["scheduled", "booked", "pending"].includes(s);
  const canComplete = !disabled && ["checked_in", "in_progress"].includes(s);
  const canCancel   = !disabled && ["scheduled", "booked", "checked_in", "pending"].includes(s);
  const canNoShow   = !disabled && ["scheduled", "booked", "pending"].includes(s);

  return (
    <div className="relative">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <button
            disabled={!canCheckIn}
            onClick={() => doAction("check_in")}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium
              ${canCheckIn ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
          >
            {busy ? "Working..." : "Check In"}
          </button>

          <button
            disabled={!canComplete}
            onClick={() => doAction("complete")}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium
              ${canComplete ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
          >
            {busy ? "Working..." : "Complete"}
          </button>

          <button
            disabled={!canCancel}
            onClick={() => {
              if (confirm("Cancel this appointment?")) doAction("cancel");
            }}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium
              ${canCancel ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
          >
            {busy ? "Working..." : "Cancel"}
          </button>

          <button
            disabled={!canNoShow}
            onClick={() => {
              if (confirm("Mark as no-show?")) doAction("no_show");
            }}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium
              ${canNoShow ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
          >
            {busy ? "Working..." : "No-Show"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ${
              toast.ok
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-rose-50 text-rose-800 ring-rose-200"
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}
