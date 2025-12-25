"use client";

import {
  Building2,
  Stethoscope,
  UserRound,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Workflow,
  Cloud,
  ClipboardCheck,
} from "lucide-react";

export default function RegisterChooser() {
  const cards = [
    {
      href: "/register/facility",
      title: "Healthcare facility",
      desc: "For organizations, multi-site clinics, or hospitals that manage multiple roles, departments, and patient records in one secure workspace.",
      icon: Building2,
      accent: "from-blue-600/10 to-blue-600/20 text-blue-700",
    },
    {
      href: "/register/provider",
      title: "Independent Provider",
      desc: "For clinicians, lab scientists, and pharmarcists who need a simple yet powerful EMR with e-Rx and visit tracking built in.",
      icon: Stethoscope,
      accent: "from-emerald-600/10 to-emerald-600/20 text-emerald-700",
    },
    {
      href: "/register/patient",
      title: "Patient",
      desc: "For individuals and dependents who want to access their health records, view results, and manage appointments in one place.",
      icon: UserRound,
      accent: "from-violet-600/10 to-violet-600/20 text-violet-700",
    },
  ];

  return (
    <div className="relative py-12 md:py-16">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Hero intro */}
      <section className="max-w-3xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          NIEMR Registration
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
          Choose your NIEMR account type
        </h1>
        <p className="mt-3 text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
          Whether you run a healthcare facility, practice as an independent provider, or want to access your medical records as a patient, NIEMR helps you do it all — securely and efficiently.
        </p>
      </section>

      {/* Account cards */}
      <section className="grid md:grid-cols-3 gap-6 mt-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.href}
              href={c.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Accent gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${c.accent} opacity-60 group-hover:opacity-80 transition-opacity`}
              />

              <div className="relative z-10 p-6 md:p-8 flex flex-col h-full justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-2.5 py-1 text-xs font-semibold tracking-wide text-blue-700 ring-1 ring-slate-200 backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5 text-blue-700" />
                    NIEMR
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 backdrop-blur border border-slate-100 shadow-sm">
                      <Icon className={`h-5 w-5 ${c.accent.split(" ")[2]}`} />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold tracking-tight text-slate-900">
                      {c.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{c.desc}</p>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-700 group-hover:underline">
                  Create account
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>
          );
        })}
      </section>

      {/* Why choose NIEMR */}
      <section className="mt-16 max-w-5xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Why choose NIEMR?
        </h2>
        <p className="mt-2 text-slate-600 max-w-2xl mx-auto text-sm md:text-base">
          Built for the realities of African healthcare — secure, offline-ready, and designed for teams and patients alike. Our ecosystem connects hospitals, labs, pharmacies, and patients seamlessly.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4 text-left">
          {[
            {
              icon: ShieldCheck,
              title: "Data security",
              text: "Your records are encrypted, role-restricted, and compliant with modern data protection standards.",
            },
            {
              icon: Workflow,
              title: "End-to-end workflows",
              text: "From appointment to discharge — all modules talk to each other in real time.",
            },
            {
              icon: Cloud,
              title: "Accessible anywhere",
              text: "Cloud-hosted architecture means you can log in from any location or device securely.",
            },
            {
              icon: ClipboardCheck,
              title: "Audit-ready",
              text: "Detailed logs track every note, edit, and approval for compliance and traceability.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                <Icon className="h-5 w-5 text-blue-700" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 md:p-8 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 items-center gap-6">
          <div>
            <h3 className="text-xl md:text-2xl font-semibold tracking-tight">
              Ready to begin your journey with NIEMR?
            </h3>
            <p className="mt-2 text-sm text-blue-100 max-w-md">
              Create your account today and join healthcare professionals and patients using NIEMR to deliver faster, smarter, and more connected care.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2.5 text-blue-700 hover:bg-white"
            >
              Get started
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
    </div>
  );
}
