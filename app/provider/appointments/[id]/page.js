export const dynamic = "force-dynamic";

// import AppointmentActions from "../../../(components)/AppointmentActions";
// import StatusBadge from "../../../(components)/StatusBadge";
import AppointmentActions from "@/components/AppointmentActions";
import StatusBadge from "@/components/StatusBadge";

async function safeFetchJSON(path, fallback = null) {
  try {
    const p = path.endsWith("/") ? path : path + "/";
    const r = await fetch(`/api/proxy${p}`, { cache: "no-store" });
    if (!r.ok) return fallback;
    return await r.json();
  } catch {
    return fallback;
  }
}

export default async function ProviderAppointmentDetail({ params }) {
  const { id } = params || {};
  const appt = await safeFetchJSON(`/appointments/${id}`, null);

  if (!appt) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <h1 className="text-2xl font-semibold text-slate-900">Appointment</h1>
        <p className="mt-2 text-slate-600">Not found or you don’t have access.</p>
        <a href="/provider/appointments" className="mt-6 inline-block text-blue-700 hover:underline">
          ← Back to appointments
        </a>
      </main>
    );
  }

  const patient  = appt.patient_name || appt.patient?.full_name || appt.patient?.name || "Patient";
  const provider = appt.provider_name || appt.provider?.full_name || appt.provider?.name || "You";
  const reason   = appt.reason || appt.visit_reason || "Consultation";
  const status   = appt.status || "scheduled";
  const start    = appt.start_time || appt.time || "—";
  const end      = appt.end_time || "—";

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10">
      <header className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Appointment #{appt.id || id}
            </h1>
            <p className="mt-1 text-slate-600">Provider view</p>
          </div>
          <StatusBadge value={status} />
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="text-slate-600">Patient</dt>
            <dd className="col-span-2 text-slate-900">{patient}</dd>

            <dt className="text-slate-600">Provider</dt>
            <dd className="col-span-2 text-slate-900">{provider}</dd>

            <dt className="text-slate-600">Reason</dt>
            <dd className="col-span-2 text-slate-900">{reason}</dd>

            <dt className="text-slate-600">Status</dt>
            <dd className="col-span-2 text-slate-900">
              <StatusBadge value={status} />
            </dd>

            <dt className="text-slate-600">Start</dt>
            <dd className="col-span-2 text-slate-900">{start}</dd>

            <dt className="text-slate-600">End</dt>
            <dd className="col-span-2 text-slate-900">{end}</dd>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Notes</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {appt.notes || appt.summary || "—"}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Actions</h2>
        <AppointmentActions id={appt.id || id} status={status} />
      </section>

      <a href="/provider/appointments" className="inline-block text-blue-700 hover:underline">
        ← Back to appointments
      </a>
    </main>
  );
}
