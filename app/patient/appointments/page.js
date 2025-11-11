export const dynamic = "force-dynamic";

function qs(obj) {
  const u = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => (v ?? v === "" ? u.set(k, String(v)) : null));
  const s = u.toString();
  return s ? `?${s}` : "";
}

async function fetchList(path) {
  try {
    const r = await fetch(`/api/proxy${path}`, { cache: "no-store" });
    if (!r.ok) return { items: [], next: null, prev: null };
    const data = await r.json();
    const items = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : [];
    const next = data?.next ? Number(new URL(data.next).searchParams.get("page")) : null;
    const prev = data?.previous ? Number(new URL(data.previous).searchParams.get("page")) : null;
    return { items, next, prev };
  } catch {
    return { items: [], next: null, prev: null };
  }
}

export default async function PatientAppointmentsPage({ searchParams: spPromise }) {
  const sp = await spPromise; // 🔑 unwrap the promise
  const page   = Number(sp?.page ?? 1);
  const date   = sp?.date ?? "";
  const status = sp?.status ?? "";
  const q      = sp?.q ?? "";

  const { items, next, prev } = await fetchList(`/appointments/${qs({ mine: true, page, limit: 20, date, status, q })}`);

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">My Appointments</h1>
        <p className="mt-1 text-slate-600">Patient view • your upcoming and past visits.</p>
      </header>

      <form className="mb-5 grid gap-3 md:grid-cols-4" method="GET">
        <input name="q" defaultValue={q} placeholder="Search reason/provider" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="date" defaultValue={date} placeholder="Date (e.g. 2025-11-10)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue={status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="checked_in">Checked in</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Apply</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length ? items.map(a => (
              <tr key={a.id}>
                <td className="px-4 py-3">{a.provider_name || a.provider?.full_name || "Provider"}</td>
                <td className="px-4 py-3">{a.reason || "Consultation"}</td>
                <td className="px-4 py-3">{a.start_time || a.time || "—"}</td>
                <td className="px-4 py-3 capitalize">{a.status || "scheduled"}</td>
              </tr>
            )) : (
              <tr><td className="px-4 py-6 text-slate-600" colSpan={4}>No appointments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="mt-4 flex items-center justify-between">
        <a href={`?${new URLSearchParams({ q, date, status, page: String(Math.max(1, prev || 1)) }).toString()}`}
           className={`text-sm ${prev ? "text-blue-700 hover:underline" : "text-slate-400 pointer-events-none"}`}>← Previous</a>
        <a href={`?${new URLSearchParams({ q, date, status, page: String(next || page) }).toString()}`}
           className={`text-sm ${next ? "text-blue-700 hover:underline" : "text-slate-400 pointer-events-none"}`}>Next →</a>
      </nav>
    </main>
  );
}
