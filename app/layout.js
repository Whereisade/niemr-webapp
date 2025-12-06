import "./globals.css";
import {
  Activity,
  Shield,
  Home,
  LogIn,
  UserPlus,
  Menu,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "NIEMR", description: "NIEMR Frontend" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-blue-50 text-slate-800 antialiased">
        {/* Skip link */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-md bg-blue-600 px-3 py-2 text-white"
        >
          Skip to content
        </a>

        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container h-16 flex items-center justify-between">
            {/* Brand */}
            <a href="/" className="group inline-flex items-center gap-3">
              <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                <Activity className="h-5 w-5" />
                <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-emerald-400" />
              </span>
              <span className="font-semibold text-xl tracking-tight group-hover:text-blue-700 transition-colors">
                NIEMR
              </span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                <Shield className="h-3 w-3" />
                Secure
              </span>
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a
                className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-700 transition-colors"
                href="/"
              >
                <Home className="h-4 w-4" />
                Home
              </a>
              <a
                className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-700 transition-colors"
                href="/login"
              >
                <LogIn className="h-4 w-4" />
                Login
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700 transition-colors"
                href="/register"
              >
                <UserPlus className="h-4 w-4" />
                Register
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
               <LogoutButton />
            </nav>

            {/* Mobile nav */}
            <details className="md:hidden relative">
              <summary className="list-none inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm hover:border-blue-200 cursor-pointer">
                <Menu className="h-5 w-5 text-slate-700" />
                <span className="sr-only">Open menu</span>
              </summary>

              <div
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                role="menu"
              >
                <a
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  href="/"
                >
                  <Home className="h-4 w-4" />
                  Home
                </a>
                <a
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  href="/login"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </a>
                <a
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  href="/register"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </a>
              </div>
            </details>
          </div>

          {/* Accent rule */}
          <div className="h-px bg-gradient-to-r from-blue-600/20 via-slate-200 to-transparent" />
        </header>

        {/* Main */}
        <main id="main" className="container py-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/70">
          <div className="container py-6 text-xs text-slate-500">
            © {new Date().getFullYear()} NIEMR — Secure, role-based healthcare records.
          </div>
        </footer>
      </body>
    </html>
  );
}
