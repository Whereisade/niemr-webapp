"use client";

import { useSearchParams } from "next/navigation";
import { useAppointments } from "@/lib/useAppointments";

/**
 * Provider list pulls your own (“mine”) appointments.
 * You’ll now see /api/proxy/appointments/?mine=true... in DevTools and Django logs.
 */
export default function ProviderAppointmentsPage() {
  const sp = useSearchParams();
  const page   = Number(sp.get("page") || 1);
  const limit  = Number(sp.get("limit") || 10);
  const status = sp.get("status") || "";
  const date   = sp.get("date")   || "today";
  const q      = sp.get("q")      || "";

  const { data, error, isLoading } = useAppointments({
    page, limit, status, date, q, mine: "true",
  });

  if (isLoading) return <div className="p-6">Loading appointments…</div>;
  if (error)     return <div className="p-6 text-red-600">Failed to load: {String(error.message || error)}</div>;

  const rows = data?.results || [];
  const total = data?.count || 0;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Appointments</h1>
      <p className="text-slate-600 text-sm mt-1">Total: {total}</p>

      {/* TODO: replace this block with your existing table/list UI */}
      <div className="mt-4 rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="p-3 text-left">Patient</th>
              <th className="p-3 text-left">Date/Time</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{a.patient_name || a.patient || "—"}</td>
                <td className="p-3">{a.scheduled_for || a.start_time || a.date || "—"}</td>
                <td className="p-3">{a.status || "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="p-3 text-slate-500" colSpan={3}>No appointments.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
