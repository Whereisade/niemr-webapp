"use client";

import {
  Activity,
  CalendarCheck,
  Stethoscope,
  FlaskConical,
  Image as ImagingIcon,
  Pill,
  FileText,
  ShieldCheck,
  ArrowRight,
  Building2,
  Users,
  Cpu,
  Cloud,
  Workflow,
  ClipboardCheck,
  History,
  FileLock2,
  Lock,
  Sparkles,
  CircleCheck,
  ChevronDown,
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: Stethoscope,
      color: "text-blue-700",
      title: "Encounter notes",
      desc: "Audit-ready (amend • close • cross-out)",
    },
    {
      icon: CalendarCheck,
      color: "text-emerald-700",
      title: "Appointments",
      desc: "Check-in • complete • cancel",
    },
    {
      icon: FlaskConical,
      color: "text-indigo-700",
      title: "Orders → Results",
      desc: "Labs & Imaging handoff",
    },
    {
      icon: ImagingIcon,
      color: "text-violet-700",
      title: "Imaging",
      desc: "Requests, reports & attachments",
    },
    {
      icon: Pill,
      color: "text-fuchsia-700",
      title: "Pharmacy",
      desc: "Inventory, e-Rx & dispensing",
    },
    {
      icon: FileText,
      color: "text-amber-700",
      title: "Reports",
      desc: "Secure uploads & PDF exports",
    },
  ];
  return (
    <div className="relative">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Hero */}
      <section className="grid gap-10 md:grid-cols-2 items-center">
        {/* Hero copy */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Activity className="h-3.5 w-3.5" />
            NIEMR Platform
          </div>

          <h1 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
            Electronic Medical Records,
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {" "}
              simplified.
            </span>
          </h1>

          <p className="mt-3 text-slate-600 text-base md:text-lg">
            Appointments, encounters, labs, imaging, pharmacy and billing —
            secure and fast.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-800 shadow-sm hover:border-blue-200 hover:text-blue-700"
            >
              Create account
            </a>
          </div>

          {/* Trust bar */}
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            HIPAA-style privacy, JWT auth, and audit trails built in.
          </div>
        </div>

        {/* Feature card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
          {/* Gradient header strip */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-slate-900 font-semibold text-lg">
                  Everything your clinic needs
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Clean workflows with status tracking and exportable reports.
                </p>
              </div>
              <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Role-based & auditable
              </div>
            </div>

            {/* Features grid */}
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map(({ icon: Icon, color, title, desc }) => (
                <li
                  key={title}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white/70 p-3 hover:-translate-y-0.5 hover:shadow-md transition"
                >
                  {/* Soft hover aura */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-50/60 to-indigo-50/50" />
                  <div className="relative flex items-start gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                      <Icon className={`h-4.5 w-4.5 ${color}`} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{title}</div>
                      <div className="text-sm text-slate-600">{desc}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Divider */}
            <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Mini CTA */}
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:border-blue-200 hover:text-blue-700 transition"
              >
                Create a free facility or provider account
                <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-xs text-slate-500">
                No setup fees. Enable modules as you grow.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-14 rounded-2xl border border-slate-200/70 bg-white/60 p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building2 className="h-4 w-4 text-blue-700" /> Facilities
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              1,240+
            </div>
            <div className="text-xs text-slate-500">
              Multi-site clinics & hospitals
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Users className="h-4 w-4 text-emerald-700" /> Providers
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              9,800+
            </div>
            <div className="text-xs text-slate-500">
              Doctors, nurses & staff
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Cpu className="h-4 w-4 text-indigo-700" /> Uptime
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              99.95%
            </div>
            <div className="text-xs text-slate-500">Monitored & resilient</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Cloud className="h-4 w-4 text-violet-700" /> Records
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              12M+
            </div>
            <div className="text-xs text-slate-500">Encrypted documents</div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mt-14">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          A workflow that mirrors real care
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          From check-in to discharge — status-driven, auditable, fast.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            {
              icon: CalendarCheck,
              title: "Schedule & Check-in",
              body: "Book, confirm, and check-in with a single click.",
            },
            {
              icon: Stethoscope,
              title: "Encounter Notes",
              body: "SOAP notes with amend/close/cross-out controls.",
            },
            {
              icon: Workflow,
              title: "Orders & Results",
              body: "Labs/Imaging with collection → result handoff.",
            },
            {
              icon: ClipboardCheck,
              title: "Billing & Discharge",
              body: "Services, ledgers, receipts, and summaries.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                <Icon className="h-5 w-5 text-blue-700" />
              </div>
              <div className="mt-3 font-medium text-slate-900">{title}</div>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules grid */}
      <section className="mt-14">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          Modules at a glance
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Enable what you need, hide what you don’t.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Stethoscope,
              label: "Encounters",
              desc: "SOAP, vitals, attachments",
            },
            {
              icon: CalendarCheck,
              label: "Appointments",
              desc: "Check-in / complete / cancel",
            },
            {
              icon: FlaskConical,
              label: "Labs",
              desc: "Orders, collection, results",
            },
            {
              icon: ImagingIcon,
              label: "Imaging",
              desc: "Requests, schedule, reports",
            },
            { icon: Pill, label: "Pharmacy", desc: "Stock, e-Rx, dispensing" },
            {
              icon: FileText,
              label: "Reports",
              desc: "PDF/HTML exports, summaries",
            },
          ].map(({ icon: Icon, label, desc }) => (
            <a
              key={label}
              href="/login"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                  <Icon className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{label}</div>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="mt-14 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600/10">
            <Lock className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900">
              Security by design
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Encryption, strict roles, and audit logs across all operations.
            </p>

            <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
              {[
                "JWT-based authentication (access + refresh)",
                "Role-based permissions: Admin/Doctor/Nurse/Patient, etc.",
                "Audit trails on edits, amendments, and closures",
                "File uploads scanned & stored with secure URLs",
                "Rate limits and IP-aware throttling",
                "Backups and disaster recovery procedures",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <FileLock2 className="h-3.5 w-3.5 text-emerald-700" />
                Encryption in transit & at rest
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <History className="h-3.5 w-3.5 text-blue-700" />
                Immutable audit logs
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-700" />
                Privacy-first defaults
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mt-14">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          What users say
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          A few notes from clinics and providers using NIEMR.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              quote:
                "Transition was seamless — labs, imaging, and pharmacy finally sync.",
              name: "Dr. Adaeze O.",
              role: "Consultant Physician",
            },
            {
              quote:
                "Audit trails saved us hours during accreditation. Worth it.",
              name: "Oyinkan T.",
              role: "Hospital Administrator",
            },
            {
              quote:
                "Patients actually check results and show up prepared. Big win.",
              name: "Musa A.",
              role: "Radiographer",
            },
          ].map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-slate-800">“{t.quote}”</p>
              <div className="mt-3 text-sm text-slate-500">
                {t.name} • {t.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          Frequently asked questions
        </h3>
        <div className="mt-4 grid gap-2">
          {[
            {
              q: "Can I use NIEMR for a single-provider practice?",
              a: "Yes — Independent Provider mode is streamlined for solo workflows (consults, e-Rx, results).",
            },
            {
              q: "Do patients get access to their results?",
              a: "Yes — patients can log in to view labs/imaging and manage dependents.",
            },
            {
              q: "How are uploads handled?",
              a: "Files are uploaded securely, linked to encounters or orders, and available in reports.",
            },
            {
              q: "Is there support for multiple locations?",
              a: "Yes — Facilities can be multi-site with location-aware permissions.",
            },
          ].map((item, idx) => (
            <details
              key={idx}
              className="group rounded-xl border border-slate-200 bg-white p-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="font-medium text-slate-800">{item.q}</span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mt-14 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 md:p-8">
        <div className="grid md:grid-cols-2 items-center gap-6">
          <div>
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight">
              Ready to get started?
            </h3>
            <p className="mt-1 text-sm text-blue-100">
              Spin up a facility space or onboard as an independent provider.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2.5 text-blue-700 hover:bg-white"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-white hover:bg-white/20"
            >
              Sign in
            </a>
          </div>
        </div>
      </section>

      {/* Quick links (kept from earlier) */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <a
          href="/login/hospital"
          className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-blue-700" />
            <div>
              <div className="font-medium text-slate-900">
                Hospital / Facility
              </div>
              <p className="text-xs text-slate-500">
                Teams, locations, and permissions
              </p>
            </div>
          </div>
        </a>
        <a
          href="/login/provider"
          className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-emerald-700" />
            <div>
              <div className="font-medium text-slate-900">
                Independent Provider
              </div>
              <p className="text-xs text-slate-500">
                Visit notes, orders &amp; e-Rx
              </p>
            </div>
          </div>
        </a>
        <a
          href="/login/patient"
          className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-violet-700" />
            <div>
              <div className="font-medium text-slate-900">Patient</div>
              <p className="text-xs text-slate-500">
                Results, meds &amp; dependents
              </p>
            </div>
          </div>
        </a>
      </section>
    </div>
  );
}
