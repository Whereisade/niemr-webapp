import AuthForm from "@/components/AuthForm";
import {
  HeartHandshake,
  ClipboardCheck,
  FlaskConical,
  Pill,
  FileText,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

export const metadata = { title: "Outreach Login — NIEMR" };

export default function OutreachLoginPage() {
  return (
    <div className="relative min-h-[70vh]">
      {/* soft background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-amber-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-orange-100 blur-3xl opacity-60" />

      <div className="container grid items-center gap-10 py-10 md:grid-cols-2">
        {/* Intro */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800">
            <HeartHandshake className="h-3.5 w-3.5" />
            Outreach Workspace
          </div>

          <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Sign in to your outreach assignment
          </h1>
          <p className="mt-2 text-slate-600">
            Outreach logins are temporary and scoped to a specific outreach event. Use the credentials provided by your
            Outreach Super Admin.
          </p>

          <ul className="mt-5 grid gap-3 text-sm">
            <li className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-700" />
              <span>Capture patient registration, vitals and encounters</span>
            </li>
            <li className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-violet-700" />
              <span>Place lab orders, record results, and keep everything event-scoped</span>
            </li>
            <li className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-fuchsia-700" />
              <span>Dispense medications and document pharmacy actions</span>
            </li>
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-700" />
              <span>Generate reports & exports at the end of the outreach</span>
            </li>
          </ul>

          <a href="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-blue-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to login types
          </a>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600" />
          <div className="p-6 md:p-8">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-600/10">
                  <HeartHandshake className="h-5 w-5 text-amber-800" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Outreach Sign In</h2>
                  <p className="text-xs text-slate-500">Use your outreach credentials.</p>
                </div>
              </div>
            </div>

            <AuthForm role="Outreach" portal="outreach" redirectTo="/outreach" />

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Access is event-scoped
              </span>
              <a href="/register/outreach" className="text-blue-700 hover:underline">
                How to get access
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
