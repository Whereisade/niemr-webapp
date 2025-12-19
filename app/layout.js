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
import SmartHomeLink from "@/components/SmartHomeLink";

import LogoutButton from "@/components/LogoutButton";
import AppHeader from "@/components/layout/AppHeader";

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

        <AppHeader />

        {/* Main */}
        <main id="main" className="container py-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/70">
          <div className="container py-6 text-xs text-slate-500">
            © {new Date().getFullYear()} NIEMR — Secure, role-based healthcare
            records.
          </div>
        </footer>
      </body>
    </html>
  );
}
