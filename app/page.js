"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarCheck,
  ChevronDown,
  CircleCheck,
  ClipboardCheck,
  Cloud,
  Cpu,
  FileLock2,
  FileText,
  FlaskConical,
  HeartHandshake,
  History,
  Image as ImagingIcon,
  Lock,
  Mail,
  Pill,
  Sparkles,
  Stethoscope,
  Users,
  Workflow,
} from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function SectionHeader({ kicker, title, desc, align = "left" }) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {kicker ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          {kicker}
        </div>
      ) : null}
      <h2 className="mt-3 text-2xl md:text-4xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      {desc ? (
        <p className="mt-2 text-sm md:text-base text-slate-600">{desc}</p>
      ) : null}
    </div>
  );
}

function PillStat({ icon: Icon, label, value, hint, accent = "text-blue-700" }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Icon className={cn("h-4 w-4", accent)} />
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </div>
          <div className="text-xs text-slate-500">{hint}</div>
        </div>
        <div className="hidden sm:grid h-10 w-10 place-items-center rounded-2xl bg-slate-50">
          <CircleCheck className="h-5 w-5 text-emerald-600" />
        </div>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
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
];

function FAQCard() {
  return (
    <div id="faq" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600/10">
          <FileText className="h-5 w-5 text-indigo-700" />
        </div>
        <div>
          <div className="font-semibold text-slate-900">FAQ</div>
          <p className="mt-1 text-sm text-slate-600">
            Quick answers before you send an enquiry.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {FAQ_ITEMS.map((item, idx) => (
          <details
            key={idx}
            className="group rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="font-semibold text-slate-800">{item.q}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}


function FeatureCard({ icon: Icon, title, desc, tone = "blue" }) {
  const toneMap = {
    blue: "from-blue-500/10 to-indigo-500/10 text-blue-700",
    emerald: "from-emerald-500/10 to-teal-500/10 text-emerald-700",
    indigo: "from-indigo-500/10 to-violet-500/10 text-indigo-700",
    violet: "from-violet-500/10 to-fuchsia-500/10 text-violet-700",
    amber: "from-amber-500/10 to-orange-500/10 text-amber-700",
    fuchsia: "from-fuchsia-500/10 to-pink-500/10 text-fuchsia-700",
  };
  const toneCls = toneMap[tone] || toneMap.blue;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100",
          "bg-gradient-to-br",
          toneCls.replace(" text-", " ").replace("text-", "")
        )}
      />
      <div className="relative flex items-start gap-4">
        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br", toneCls)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold text-slate-900">{title}</div>
          <p className="mt-1 text-sm text-slate-600">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function MockAppPreview({ role }) {
  const roleLabel =
    role === "facility"
      ? "Facility Dashboard"
      : role === "provider"
      ? "Provider Workspace"
      : role === "patient"
      ? "Patient Portal"
      : "Outreach Dashboard";
  const roleBadge =
    role === "facility"
      ? "bg-blue-600/10 text-blue-700 border-blue-200/60"
      : role === "provider"
      ? "bg-emerald-600/10 text-emerald-700 border-emerald-200/60"
      : role === "patient"
      ? "bg-violet-600/10 text-violet-700 border-violet-200/60"
      : "bg-amber-600/10 text-amber-800 border-amber-200/60";

  const sidebarItems =
    role === "outreach"
      ? [
          { label: "Overview", active: true },
          { label: "Patients" },
          { label: "Encounters" },
          { label: "Labs" },
          { label: "Pharmacy" },
          { label: "Reports" },
        ]
      : [
          { label: "Overview", active: true },
          { label: "Appointments" },
          { label: "Encounters" },
          { label: "Labs / Imaging" },
          { label: "Pharmacy" },
          { label: "Reports" },
        ];

  const snapshot =
    role === "outreach"
      ? [
          { label: "Registered", value: "86", tint: "bg-amber-500/10 text-amber-700" },
          { label: "In service", value: "19", tint: "bg-blue-500/10 text-blue-700" },
          { label: "Completed", value: "67", tint: "bg-emerald-500/10 text-emerald-700" },
        ]
      : [
          { label: "Pending", value: role === "patient" ? "2" : "14", tint: "bg-amber-500/10 text-amber-700" },
          { label: "In progress", value: role === "patient" ? "1" : "7", tint: "bg-blue-500/10 text-blue-700" },
          { label: "Completed", value: role === "patient" ? "5" : "23", tint: "bg-emerald-500/10 text-emerald-700" },
        ];

  return (
    <div className="relative rounded-3xl border border-slate-200 bg-white/70 shadow-xl backdrop-blur">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white to-slate-50" />
      <div className="relative overflow-hidden rounded-3xl">
        {/* window chrome */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold", roleBadge)}>
            {roleLabel}
          </div>
        </div>

        {/* body */}
        <div className="grid grid-cols-12 gap-0">
          {/* sidebar */}
          <div className="col-span-4 sm:col-span-3 border-r border-slate-200/70 bg-white/60 p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">NIEMR</div>
                <div className="text-[11px] text-slate-500">Secure EMR</div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {sidebarItems.map((i) => (
                <div
                  key={i.label}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs font-medium transition",
                    i.active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {i.label}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-[11px] font-semibold text-slate-900">
                Status-driven
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {role === "outreach"
                  ? "Registration → Vitals → Encounter → Orders → Results → Reports"
                  : "Check-in → Encounter → Orders → Results → Billing"}
              </div>
            </div>
          </div>

          {/* main */}
          <div className="col-span-8 sm:col-span-9 bg-gradient-to-br from-white to-slate-50 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Today</div>
                <div className="text-lg font-semibold text-slate-900">
                  Quick snapshot
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  Role-based access
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {snapshot.map((k) => (
                <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">{k.label}</div>
                  <div className="mt-1 flex items-end justify-between">
                    <div className="text-2xl font-semibold text-slate-900">{k.value}</div>
                    <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", k.tint)}>
                      Live
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Next action</div>
                  <div className="font-semibold text-slate-900">
                    {role === "patient"
                      ? "View your latest lab results"
                      : role === "provider"
                      ? "Finish encounter note for the next patient"
                      : role === "outreach"
                      ? "Select your outreach event and start registering patients"
                      : "Review pending approvals & daily throughput"}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-500">Realtime</span>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Clear steps. Clean handoffs. Audit-friendly updates.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* glow */}
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
    </div>
  );
}

export default function HomePage() {
  const [role, setRole] = useState("facility");

  const features = useMemo(
    () => [
      {
        icon: Stethoscope,
        title: "Encounter notes",
        desc: "Audit-ready edits (amend • close • cross-out) with traceability.",
        tone: "blue",
      },
      {
        icon: CalendarCheck,
        title: "Appointments",
        desc: "Book, confirm, check-in, complete, cancel — with clean status flow.",
        tone: "emerald",
      },
      {
        icon: FlaskConical,
        title: "Orders → Results",
        desc: "Labs & Imaging handoff with collection → result lifecycle.",
        tone: "indigo",
      },
      {
        icon: ImagingIcon,
        title: "Imaging",
        desc: "Requests, reports, attachments, and viewing-ready uploads.",
        tone: "violet",
      },
      {
        icon: Pill,
        title: "Pharmacy",
        desc: "Inventory, e-Rx, dispensing, and controlled record keeping.",
        tone: "fuchsia",
      },
      {
        icon: FileText,
        title: "Reports",
        desc: "Secure uploads, exports, summaries, and shareable documentation.",
        tone: "amber",
      },
    ],
    []
  );

  const personas = useMemo(
    () => ({
      facility: {
        label: "Facility",
        title: "Run your Hospital/Healthcare like a modern system — not a paper pile.",
        desc: "Multi-role workflows, location-aware permissions, and operations that scale.",
        bullets: [
          "Multi-site support with role permissions",
          "Daily throughput + operational insights",
          "Audit trails for accreditation readiness",
          "HIPAA/GDPR compliance ready",
        ],
        ctaPrimary: { label: "Create facility account", href: "/register/facility" },
        ctaSecondary: { label: "Facility sign in", href: "/login/facility" },
        badgeClass: "border-blue-200/60 bg-blue-600/10 text-blue-700",
      },
      provider: {
        label: "Solo Practice",
        title: "Take the guess work out of your practice",
        desc: "Take advantage of a streamlined workspace for your solo, independent or freelance clinical practice",
        bullets: [
          "Quick visit notes and order flow",
          "Simple billing and receipts",
          "Works great for specialists & standalone providers",
          "HIPAA/GDPR compliance ready",
        ],
        ctaPrimary: { label: "Create provider account", href: "/register/provider" },
        ctaSecondary: { label: "Provider sign in", href: "/login/provider" },
        badgeClass: "border-emerald-200/60 bg-emerald-600/10 text-emerald-700",
      },
      patient: {
        label: "Patient",
        title: "Tired of loosing your test results and other vital medical records and information?",
        desc: "Create an account for yourself and your dependants and securely store your vital medical information, results, labs, imaging, referrals, self-monitoring etc - all in one dedicated and secure portal for easy access anytime, anywhere",
        bullets: [
          "View lab/imaging results securely",
          "Manage dependents with access controls",
          "Stay updated with visit & prescription history",
          "HIPAA/GDPR compliance ready",
        ],
        ctaPrimary: { label: "Create patient account", href: "/register/patient" },
        ctaSecondary: { label: "Patient sign in", href: "/login/patient" },
        badgeClass: "border-violet-200/60 bg-violet-600/10 text-violet-700",
      },
      outreach: {
        label: "Outreach",
        title: "Planning your next medical mission/ community health outreach?",
        desc: "Run community outreaches with event scoped records and fast capture",
        bullets: [
          "Create an outreach event and assign roles to staff",
          "Register patients, capture vitals, encounters, and orders",
          "Generate outreach reports (lab, pharmacy, immunization, etc.)",
          "HIPAA/GDPR compliance ready",
        ],
        ctaPrimary: { label: "Outreach Registration", href: "/register/outreach" },
        ctaSecondary: { label: "Open outreach workspace", href: "/login/outreach" },
        badgeClass: "border-amber-200/60 bg-amber-600/10 text-amber-800",
      },
    }),
    []
  );

  const activePersona = personas[role];

  return (
    <main className="relative isolate">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_55%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.08),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.25] [background-image:linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* Top nav */}
      {/* <header className="sticky top-0 z-40 -mx-4 mb-8 border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
              <Activity className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">NIEMR</div>
              <div className="text-[11px] text-slate-500">Electronic Medical Records</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#workflow" className="hover:text-slate-900">Workflow</a>
            <a href="#security" className="hover:text-slate-900">Security</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
            <a href="#contact" className="hover:text-slate-900">Contact</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-sm hover:border-blue-200 hover:text-blue-700"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header> */}

      <div className="mx-auto max-w-6xl px-0">
        {/* HERO */}
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
              <Activity className="h-3.5 w-3.5 text-blue-700" />
              NIEMR Platform
              <span className="mx-1 h-3 w-px bg-slate-200" />
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  activePersona.badgeClass,
                )}
              >
                {activePersona.label}
              </span>
            </div>

            <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
              Electronic Medical Records,
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}
                beautifully organized.
              </span>
            </h1>

            <p className="mt-3 text-slate-600 text-base md:text-lg">
              Appointments, encounters, labs, imaging, pharmacy, and billing —
              fast, secure, and designed for real clinical flow.
            </p>

            {/* Persona switch */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Choose your mode
                    </div>
                    <div className="text-xs text-slate-500">
                      Tailored value props & preview
                    </div>
                  </div>

                  <div className="flex flex-wrap rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                    {["facility", "provider", "patient", "outreach"].map(
                      (k) => (
                        <button
                          key={k}
                          onClick={() => setRole(k)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                            role === k
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:bg-slate-100",
                          )}
                          type="button"
                        >
                          {personas[k].label}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {activePersona.title}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {activePersona.desc}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "hidden sm:inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold",
                        activePersona.badgeClass,
                      )}
                    >
                      Optimized
                    </span>
                  </div>

                  <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                    {activePersona.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-slate-700"
                      >
                        <CircleCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={activePersona.ctaPrimary.href}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
                    >
                      {activePersona.ctaPrimary.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={activePersona.ctaSecondary.href}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:border-blue-200 hover:text-blue-700"
                    >
                      {activePersona.ctaSecondary.label}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - mock preview */}
          <div className="lg:pl-6">
            <MockAppPreview role={role} />
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mt-16">
          <SectionHeader
            kicker="Everything in one flow"
            title="Modules that feel connected — not stitched together."
            desc="No scattered tools. Just one clean system that mirrors how care actually happens."
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>

          {/* highlight strip */}
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
            <div className="grid gap-6 md:grid-cols-3 md:items-center">
              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-slate-900">
                  Designed for speed, clarity, and compliance readiness.
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Status tracking, clean audit logs, and secure exports —
                  without slowing clinicians down.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {[
                  { icon: FileLock2, text: "Encrypted uploads" },
                  { icon: History, text: "Immutable audit trails" },
                  { icon: Sparkles, text: "Clean UX defaults" },
                ].map(({ icon: Icon, text }) => (
                  <span
                    key={text}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                  >
                    <Icon className="h-3.5 w-3.5 text-indigo-700" />
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section id="workflow" className="mt-16">
          <SectionHeader
            kicker="Status-driven care"
            title="A workflow that mirrors real clinical steps."
            desc="From check-in to discharge — each stage is trackable, auditable, and fast."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              {
                icon: CalendarCheck,
                title: "Schedule & Check-in",
                body: "Book, confirm, and check-in with one clean status flow.",
              },
              {
                icon: Stethoscope,
                title: "Encounter Notes",
                body: "SOAP notes with amend/close/cross-out controls and traceability.",
              },
              {
                icon: Workflow,
                title: "Orders & Results",
                body: "Labs/Imaging with collection → result handoff and attachments.",
              },
              {
                icon: ClipboardCheck,
                title: "Billing & Discharge",
                body: "Services, ledgers, receipts, and discharge summaries.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10">
                  <Icon className="h-6 w-6 text-blue-700" />
                </div>
                <div className="mt-4 font-semibold text-slate-900">{title}</div>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
                <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <div className="mt-3 text-xs text-slate-500">
                  Built for{" "}
                  {role === "patient" ? "patient clarity" : "clinical speed"}.
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECURITY */}
        <section id="security" className="mt-16">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 p-6 md:p-10 text-white shadow-xl">
            <div className="grid gap-8 md:grid-cols-2 md:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                  <Lock className="h-3.5 w-3.5 text-emerald-300" />
                  Security by design
                </div>
                <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">
                  Privacy-first defaults, strict roles, and audit trails.
                </h3>
                <p className="mt-2 text-sm md:text-base text-white/75">
                  Built for clinical environments where trust, access control,
                  and traceability matter.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {["Encryption in transit & at rest", "Audit logs"].map(
                    (t) => (
                      <span
                        key={t}
                        className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80"
                      >
                        {t}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15">
                    <FileLock2 className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <div className="font-semibold">What’s included</div>
                    <div className="text-sm text-white/70">
                      Practical controls you can actually rely on.
                    </div>
                  </div>
                </div>

                <ul className="mt-5 grid gap-2 text-sm text-white/85">
                  {[
                    "Safe and private access for every user",
                    "Only approved users can view sensitive information",
                    "Reliable record-keeping with accountability",
                    "Secure handling of documents and uploads",
                    "Changes are tracked for accountability",
                    "Designed to protect data and support recovery",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CircleCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="mt-16">
          <SectionHeader
            kicker="Loved by teams"
            title="What users say"
            desc="A few notes from clinics and providers using NIEMR."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
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
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-slate-800 text-sm md:text-base">
                  “{t.quote}”
                </p>
                <div className="mt-4 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{t.name}</span> •{" "}
                  {t.role}
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* CTA */}
        <section className="mt-16">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-600 to-indigo-600 p-6 md:p-10 text-white shadow-xl">
            <div className="grid gap-6 md:grid-cols-2 md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  Start in minutes
                </div>
                <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">
                  Ready to get started?
                </h3>
                <p className="mt-2 text-sm md:text-base text-white/80">
                  Create a facility space or onboard as an independent provider.
                  Patients can access results securely.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm hover:brightness-95"
                >
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-white/15"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/login/facility",
              title: "Hospital / Facility",
              desc: "Teams, locations, permissions",
              icon: Stethoscope,
              tint: "text-blue-700",
            },
            {
              href: "/login/provider",
              title: "Independent Provider",
              desc: "Visit notes, orders & e-Rx",
              icon: Stethoscope,
              tint: "text-emerald-700",
            },
            {
              href: "/login/patient",
              title: "Patient",
              desc: "Results, meds & dependents",
              icon: CalendarCheck,
              tint: "text-violet-700",
            },
            {
              href: "/login/outreach",
              title: "Outreach",
              desc: "Event-scoped records & reports",
              icon: HeartHandshake,
              tint: "text-amber-800",
            },
          ].map((l) => (
            <Link
              key={l.title}
              href={l.href}
              className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50">
                  <l.icon className={cn("h-5 w-5", l.tint)} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{l.title}</div>
                  <p className="text-xs text-slate-500">{l.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* ENQUIRY */}
        <section id="contact" className="mt-16">
          <SectionHeader
            kicker="Enquiries"
            title="Send us a message"
            desc="Drop an enquiry and we'll get back to you."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <FAQCard />
            <EnquiryForm />
          </div>
        </section>

        <footer className="mt-14 pb-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} NIEMR • Built for modern healthcare
          workflows
        </footer>
      </div>
    </main>
  );
}

function ShieldInline() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600/10">
        <Lock className="h-3 w-3 text-emerald-700" />
      </span>
    </span>
  );
}


function EnquiryForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "", // honeypot
  });
  const [status, setStatus] = useState({ loading: false, success: false, error: "" });

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: "" });
    try {
      await apiFetch("/emails/enquiries/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setStatus({ loading: false, success: true, error: "" });
      setForm({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
    } catch (err) {
      setStatus({ loading: false, success: false, error: err?.message || "Something went wrong" });
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-slate-900">Enquiry form</div>
          <p className="mt-1 text-sm text-slate-600">Tell us what you need — we’ll respond by email.</p>
        </div>
        {status.success ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold text-emerald-800">
            <CircleCheck className="h-4 w-4" />
            Sent
          </span>
        ) : null}
      </div>

      {status.error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {status.error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        {/* Honeypot: keep hidden and empty */}
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={onChange}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Full name</label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Phone (optional)</label>
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="+234..."
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Subject (optional)</label>
            <input
              name="subject"
              value={form.subject}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="Demo, onboarding, partnership..."
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Message</label>
          <textarea
            name="message"
            value={form.message}
            onChange={onChange}
            required
            rows={5}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            placeholder="Share a bit more about your use case..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={status.loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm",
              status.loading ? "opacity-70" : "hover:brightness-110"
            )}
          >
            {status.loading ? "Sending..." : "Send enquiry"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs text-slate-500">No spam. We only use your details to respond.</p>
        </div>
      </form>
    </div>
  );
}
