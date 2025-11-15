"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAppointments } from "@/lib/useAppointments";
import StatusBadge from "@/components/StatusBadge";
import Paginator from "@/components/Paginator";

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

export default function FacilityAppointmentsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page   = Number(sp.get("page") || 1);
  const limit  = Number(sp.get("limit") || 10);
  const status = sp.get("status") || "";
  const q      = sp.get("q")      || "";

  // For facility logins, backend auto-filters by facility_id on the user
  const { data, error, isLoading } = useAppointments({
    page,
    limit,
    status,
    q,
  });

  const rows = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
  const total = Number(data?.count ?? rows.length);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    if ("status" in patch || "q" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          Facility Appointments
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Loading appointments…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          Facility Appointments
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Facility Appointments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            All appointments scheduled for this facility.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search reason or notes…"
            defaultValue={q}
            onBlur={(e) => updateQuery({ q: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-56"
          />
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="checked_in">Checked In</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Patient
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Provider
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                When
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="p-3 text-sm text-slate-800">
                  {a.patient_name || a.patient || "—"}
                </td>
                <td className="p-3 text-sm text-slate-800">
                  {a.provider_name || a.provider || "—"}
                </td>
                <td className="p-3 text-sm text-slate-800">
                  {formatDateTime(a.start_at || a.scheduled_for || a.date)}
                </td>
                <td className="p-3 text-sm">
                  <StatusBadge value={a.status} />
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td className="p-4 text-center text-sm text-slate-500" colSpan={4}>
                  No appointments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginator page={page} total={total} perPage={limit} />
    </main>
  );
}
