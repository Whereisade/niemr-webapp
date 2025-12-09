"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { fetchAccountProfile } from "@/lib/accountProfile";

/**
 * Smart "Home" link:
 * - Logged out  → "/" (landing Home)
 * - PATIENT     → "/patient" (patient dashboard)
 * - Staff roles → "/facility" (facility dashboard)
 */
export default function SmartHomeLink({ className = "" }) {
  const [href, setHref] = useState("/");
  const [label, setLabel] = useState("Home");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const profile = await fetchAccountProfile();
        if (!profile || cancelled) return;

        // adapt these keys to whatever your /accounts/me/ returns
        const role =
          profile.role ||
          profile.account_type ||
          profile.user_type ||
          profile.user_role;

        if (role === "PATIENT") {
          setHref("/patient");
          setLabel("My Health");
        } else if (
          [
            "ADMIN",
            "SUPER_ADMIN",
            "DOCTOR",
            "NURSE",
            "LAB",
            "PHARMACY",
            "FRONTDESK",
          ].includes(role)
        ) {
          setHref("/facility");
          setLabel("Dashboard");
        } else {
          // fallback for anything unknown but authenticated
          setHref("/facility");
          setLabel("Dashboard");
        }
      } catch (err) {
        // 401 / not logged in → stay on marketing home
        setHref("/");
        setLabel("Home");
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-slate-700 hover:text-blue-700 transition-colors ${className}`}
    >
      <Home className="h-4 w-4" />
      {label}
    </Link>
  );
}
