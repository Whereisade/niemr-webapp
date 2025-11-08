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
  LogIn,
} from "lucide-react";

export default function LoginChooser() {
  const cards = [
    {
      href: "/login/facility",
      title: "Hospital / Facility",
      desc: "For healthcare facilities and clinics that manage multiple providers, appointments, and records securely.",
      icon: Building2,
      accent: "from-blue-600/10 to-blue-600/20 text-blue-700",
    },
    {
      href: "/login/provider",
      title: "Independent Provider",
      desc: "For doctors, nurses, and other practitioners accessing their NIEMR workspace and patient notes.",
      icon: Stethoscope,
      accent: "from-emerald-600/10 to-emerald-600/20 text-emerald-700",
    },
    {
      href: "/login/patient",
      title: "Patient",
      desc: "For patients and dependents accessing results, medications, and appointment reminders.",
      icon: UserRound,
      accent: "from-violet-600/10 to-violet-600/20 text-violet-700",
    },
  ];

  return (
    <div className="relative py-12 md:py-16">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Hero header */}
      <section className="max-w-3xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <LogIn className="h-3.5 w-3.5" />
          NIEMR Login
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
          Choose how you want to sign in
        </h1>
        <p className="mt-3 text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
          Select your role below to access your NIEMR dashboard. Each portal is
          optimized for your specific workflow and permissions.
        </p>
      </section>

      {/* Login type cards */}
      <section className="grid md:grid-cols-3 gap-6 mt-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.href}
              href={c.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Gradient accent */}
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
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {c.desc}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-700 group-hover:underline">
                  Sign in
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>
          );
        })}
      </section>

      {/* Why section */}
      <section className="mt-16 max-w-5xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Why sign in with NIEMR?
        </h2>
        <p className="mt-2 text-slate-600 max-w-2xl mx-auto text-sm md:text-base">
          NIEMR securely connects your healthcare workflow — from labs to pharmacy — 
          so you can focus on what truly matters: patient care and efficiency.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4 text-left">
          {[
            {
              icon: ShieldCheck,
              title: "Secure Access",
              text: "Every login is protected by JWT tokens and strict role permissions.",
            },
            {
              icon: Workflow,
              title: "Connected Workflow",
              text: "Access your labs, imaging, and prescriptions from one place.",
            },
            {
              icon: Cloud,
              title: "Available Anywhere",
              text: "Work securely from your hospital, home, or mobile device.",
            },
            {
              icon: ClipboardCheck,
              title: "Smart Audit",
              text: "All actions are tracked, timestamped, and available for review.",
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
              Don’t have an account yet?
            </h3>
            <p className="mt-2 text-sm text-blue-100 max-w-md">
              You can create a new NIEMR account as a facility, provider, or patient — 
              all free and easy to set up.
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
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-white hover:bg-white/20"
            >
              Back to Home
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
