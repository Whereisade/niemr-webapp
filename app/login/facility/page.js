import AuthForm from "@/components/AuthForm";
import {
  Building2,
  ShieldCheck,
  ClipboardCheck,
  Stethoscope,
  ArrowLeft,
} from "lucide-react";

export const metadata = { title: "Facility Login — NIEMR" };

export default function FacilityLoginPage() {
  return (
    <div className="relative min-h-[70vh]">
      {/* soft background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      <div className="container grid items-center gap-10 py-10 md:grid-cols-2">
        {/* Intro / benefits */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Building2 className="h-3.5 w-3.5" />
            Healthcare Facility Portal
          </div>

          <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Sign in to your facility workspace
          </h1>
          <p className="mt-2 text-slate-600">
            Manage appointments, orders, results, pharmacy, billing, and teams —
            with strict role-based access controls.
          </p>

          <ul className="mt-5 grid gap-3 text-sm">
            <li className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-blue-700" />
              <span>Encounters, e-Rx, labs & imaging in one place</span>
            </li>
            <li className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-700" />
              <span>Status tracking from check-in to discharge</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-700" />
              <span>Audit trail and permissions for every action</span>
            </li>
          </ul>

          <a
            href="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login types
          </a>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          {/* gradient top border */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="p-6 md:p-8">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10">
                  <Building2 className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Healthcare Facility Sign In
                  </h2>
                  <p className="text-xs text-slate-500">
                    Use your administrator or staff account.
                  </p>
                </div>
              </div>
            </div>

            <AuthForm role="Healthcare Facility" redirectTo="/facility" />

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Secured with JWT & audit logs
              </span>
              <a
                href="/register/facility"
                className="text-blue-700 hover:underline"
              >
                Create facility account
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
