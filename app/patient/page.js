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

export default async function PatientDashboard() {
  const [notifications, myAppointments, myLabs, myRx] = await Promise.all([
    safeFetchJSON("/notifications/items/?since=7d", []),
    safeFetchJSON("/appointments/?date=today&mine=true&limit=10", []),
    safeFetchJSON("/labs/?mine=true&limit=10", []),           // optional: may be empty if not implemented yet
    safeFetchJSON("/pharmacy/prescriptions/?mine=true&limit=10", []), // optional
  ]);

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Patient Dashboard
        </h1>
        <p className="mt-1 text-slate-600">Your appointments, results and reminders.</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today’s Appointments */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Today’s Appointments</h2>
            <a href="/patient/appointments" className="text-sm text-blue-700 hover:underline">
              View all
            </a>
          </div>
          <ul className="divide-y divide-slate-100">
            {Array.isArray(myAppointments) && myAppointments.length > 0 ? (
              myAppointments.map((a) => (
                <li key={a.id} className="p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {a.provider_name || a.provider?.full_name || "Provider"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {a.reason || "Consultation"} • {a.start_time || a.time || "—"}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {a.status || "scheduled"}
                  </span>
                </li>
              ))
            ) : (
              <li className="p-5 text-sm text-slate-600">No appointments found for today.</li>
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

      {/* Results & Meds */}
      <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Recent Lab Results</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {Array.isArray(myLabs) && myLabs.length > 0 ? (
              myLabs.slice(0, 8).map((l) => (
                <li key={l.id} className="p-5">
                  <p className="text-sm font-medium text-slate-900">
                    {l.test_name || l.name || "Lab Test"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {l.result_summary || l.result || l.status || "—"}
                  </p>
                </li>
              ))
            ) : (
              <li className="p-5 text-sm text-slate-600">No lab results available.</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="p-5 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Active Prescriptions</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {Array.isArray(myRx) && myRx.length > 0 ? (
              myRx.slice(0, 8).map((p) => (
                <li key={p.id} className="p-5">
                  <p className="text-sm font-medium text-slate-900">{p.drug_name || p.item || "Medication"}</p>
                  <p className="text-sm text-slate-600">{p.sig || p.instructions || p.status || "—"}</p>
                </li>
              ))
            ) : (
              <li className="p-5 text-sm text-slate-600">No active prescriptions.</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
