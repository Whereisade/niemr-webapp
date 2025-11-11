export const dynamic = "force-dynamic";

async function safeFetchJSON(path, fallback) {
  try {
    const r = await fetch(`/api/proxy${path.endsWith("/") ? path : path + "/"}`, { cache: "no-store" });
    if (!r.ok) return fallback;
    return await r.json();
  } catch {
    return fallback;
  }
}

export default async function FacilityDashboard() {
  const [notifications, todaysAppointments, providers] = await Promise.all([
    safeFetchJSON("/notifications/items/?since=7d", []),
    safeFetchJSON("/appointments/?date=today&limit=10", []),
    safeFetchJSON("/providers/?limit=5", []), // harmless if endpoint requires perms; will just show empty
  ]);

  const notifList = Array.isArray(notifications) ? notifications : (notifications?.results || []);
  const appts     = Array.isArray(todaysAppointments) ? todaysAppointments : (todaysAppointments?.results || []);
  const provs     = Array.isArray(providers) ? providers : (providers?.results || []);

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Facility Home</h1>
        <p className="mt-1 text-slate-600">Snapshot across your clinic.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">Today’s Appointments</p>
          <p className="mt-1 text-3xl font-semibold">{appts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">Active Providers (preview)</p>
          <p className="mt-1 text-3xl font-semibold">{provs.length}</p>
        </div>
        <a href="/facility/appointments"
           className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 p-5 hover:shadow">
          <p className="text-sm text-slate-700">Scheduling</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">View all appointments →</p>
        </a>
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Today’s Appointments</h2>
          <a href="/facility/appointments" className="text-sm text-blue-700 hover:underline">View all</a>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appts.length ? appts.map(a => (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.patient_name || a.patient?.full_name || "Patient"}</td>
                  <td className="px-4 py-3">{a.provider_name || a.provider?.full_name || "Provider"}</td>
                  <td className="px-4 py-3">{a.reason || "Consultation"}</td>
                  <td className="px-4 py-3">{a.start_time || a.time || "—"}</td>
                  <td className="px-4 py-3 capitalize">{a.status || "scheduled"}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-6 text-slate-600">No appointments for today.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent Notifications</h2>
          <a href="/facility/notifications" className="text-sm text-blue-700 hover:underline">View all</a>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <ul className="divide-y divide-slate-100">
            {notifList.length ? notifList.slice(0, 6).map((n, i) => (
              <li key={n.id || i} className="py-3">
                <p className="font-medium text-slate-900">{n.title || n.kind || "Notification"}</p>
                <p className="text-sm text-slate-600">{n.body || n.message || ""}</p>
              </li>
            )) : (
              <li className="py-3 text-slate-600">No recent notifications.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
