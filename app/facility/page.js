export const dynamic = "force-dynamic";

async function safeFetchJSON(path, fallback) {
  try {
    const r = await fetch(`/api/proxy${path}`, { cache: "no-store" });
    if (!r.ok) return fallback;
    return await r.json();
  } catch {
    return fallback;
  }
}

export default async function HospitalDashboard() {
  const [notifications, todayAppointments] = await Promise.all([
    safeFetchJSON("/notifications/items/?since=7d", []),
    safeFetchJSON("/appointments/?date=today&limit=10", []), // facility-wide if token is a facility admin
  ]);

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Facility Dashboard
        </h1>
        <p className="mt-1 text-slate-600">Key actions and today’s activity across your hospital/clinic.</p>
      </header>

      {/* Quick Actions */}
      <section className="grid gap-4 md:grid-cols-3 mb-8">
        <a href="/dashboard/hospital/staff" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow">
          <p className="font-semibold text-slate-900">Staff Onboarding</p>
          <p className="text-sm text-slate-600">Create and manage clinicians for your facility.</p>
        </a>
        <a href="/dashboard/hospital/pharmacy/import" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow">
          <p className="font-semibold text-slate-900">Pharmacy CSV Import</p>
          <p className="text-sm text-slate-600">Upload your drug catalog in bulk.</p>
        </a>
        <a href="/dashboard/hospital/labs" className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow">
          <p className="font-semibold text-slate-900">Lab Orders</p>
          <p className="text-sm text-slate-600">View and manage incoming test requests.</p>
        </a>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today’s Appointments */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Today’s Appointments</h2>
            <a href="/facility/appointments" className="text-sm text-blue-700 hover:underline">
              View all
            </a>
          </div>
          <ul className="divide-y divide-slate-100">
            {Array.isArray(todayAppointments) && todayAppointments.length > 0 ? (
              todayAppointments.map((a) => (
                <li key={a.id} className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {a.patient_name || a.patient?.full_name || "Patient"} • {a.provider_name || a.provider?.full_name || "Provider"}
                    </p>
                    <p className="text-sm text-slate-600">{a.reason || "Consultation"} • {a.start_time || a.time || "—"}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {a.status || "scheduled"}
                  </span>
                </li>
              ))
            ) : (
              <li className="p-5 text-sm text-slate-600">No facility appointments found for today.</li>
            )}
          </ul>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Recent Notifications</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {Array.isArray(notifications) && notifications.length > 0 ? (
              notifications.slice(0, 10).map((n) => (
                <li key={n.id || `${n.type}-${n.created_at}`} className="p-5">
                  <p className="text-sm font-medium text-slate-900">{n.title || n.type || "Notification"}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{n.message || n.content || "—"}</p>
                  <p className="text-xs text-slate-500 mt-1">{n.created_at || n.timestamp || ""}</p>
                </li>
              ))
            ) : (
              <li className="p-5 text-sm text-slate-600">No recent notifications.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
