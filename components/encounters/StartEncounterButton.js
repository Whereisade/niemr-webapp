// components/encounters/StartEncounterButton.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Play } from "lucide-react";

export default function StartEncounterButton({ scope, appointment, size = "sm", onSuccess }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/accounts/me/", { method: "GET" })
      .then((data) => {
        if (!cancelled) setMe(data || null);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = async () => {
    if (loading || !appointment?.id) return;
    setLoading(true);

    try {
      const url = scope === "facility" 
        ? `/encounters/facility-encounters/start_from_appointment/`
        : `/encounters/start_from_appointment/`;

      const res = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify({ appointment_id: appointment.id }),
      });

      if (res?.id) {
        const encounterId = res.id;
        const role = String(me?.role || "").toUpperCase();
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(res);
        }
        
        // Route based on scope (facility vs provider workspace)
        const workspacePath = scope === "facility" ? "/facility" : "/provider";
        
        // Doctors go directly to clinical workflow
        // Nurses go to nurse assessment workflow
        if (role === "DOCTOR") {
          router.push(`${workspacePath}/encounters/${encounterId}/workflow/clinical`);
        } else if (role === "NURSE") {
          router.push(`${workspacePath}/encounters/${encounterId}/workflow/nurse`);
        } else {
          // Fallback for other roles (LAB, PHARMACY, etc.)
          router.push(`${workspacePath}/encounters/${encounterId}`);
        }
      }
    } catch (err) {
      console.error("Failed to start encounter:", err);
      alert(err?.message || "Failed to start encounter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-600 ${sizeClasses[size]} font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors`}
    >
      <Play className="h-3.5 w-3.5" />
      {loading ? "Starting..." : "Start Encounter"}
    </button>
  );
}