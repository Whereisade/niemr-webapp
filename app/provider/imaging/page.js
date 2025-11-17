"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useImagingRequests } from "@/lib/useImagingRequests";

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

export default function ProviderImagingRequestsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page    = Number(sp.get("page") || 1);
  const limit   = Number(sp.get("limit") || 20);
  const status  = sp.get("status") || "";
  const patient = sp.get("patient") || "";
  const s       = sp.get("s")      || "";

  // Backend scopes by facility / role in ImagingRequestViewSet.get_queryset()
  const { data, error, isLoading } = useImagingRequests({
    page,
    limit,
    status,
    patient,
    s,
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
    if ("status" in patch || "patient" in patch || "s" in patch || "limit" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          Imaging Requests
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Loading imaging requests…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          Imaging Requests
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
            Imaging Requests
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and track imaging procedures requested for patients in this facility.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search indication / notes…"
            defaultValue={s}
            onBlur={(e) => updateQuery({ s: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-56"
          />
          <input
            type="text"
            placeholder="Filter by patient ID…"
            defaultValue={patient}
            onBlur={(e) => updateQuery({ patient: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-56"
          />
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Patient
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Procedure
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scheduled For
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50">
                <td className="p-3 text-sm text-slate-800">
                  {req.patient_name || req.patient || "—"}
                </td>
                <td className="p-3 text-sm text-slate-800">
                  {req.procedure_name || req.procedure || "—"}
                </td>
                <td className="p-3 text-sm text-slate-800">
                  {req.status || "—"}
                </td>
                <td className="p-3 text-sm text-slate-800">
                  {formatDateTime(req.scheduled_for || req.created_at)}
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td
                  className="p-4 text-center text-sm text-slate-500"
                  colSpan={4}
                >
                  No imaging requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Simple pager */}
      <div className="flex items-center justify-between pt-2 text-sm text-slate-600">
        <div>
          Page {page} · {total} total
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateQuery({ page: page - 1 })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={rows.length < limit}
            onClick={() => updateQuery({ page: page + 1 })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
