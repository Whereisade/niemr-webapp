"use client";

import Link from "next/link";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import PatientPicker from "@/components/outreach/PatientPicker";
import { useOutreachSession } from "@/lib/useOutreachSession";
import { hasPerm, OUTREACH_PERMS, isModuleEnabled } from "@/lib/outreachConfig";
import { ArrowLeft, Eye } from "lucide-react";

export default function OutreachEyeChecksPage() {
  const {
    loading: sessionLoading,
    error: sessionError,
    assignments,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    permissions,
    switchEvent,
  } = useOutreachSession();

  const modulesEnabled = selectedEvent?.modules_enabled || {};
  const enabled = isModuleEnabled(modulesEnabled, "eye_checks");
  const allowed = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.EYE_CHECKS_CREATE);

  if (sessionError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {sessionError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/outreach"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div>
          <div className="inline-flex items-center gap-2">
            <Eye className="h-5 w-5 text-slate-800" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Eye checks</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">Pick a patient to record eye checks.</p>
        </div>
      </div>

      <OutreachEventPicker
        loading={sessionLoading}
        assignments={assignments}
        isOutreachSuperAdmin={isOutreachSuperAdmin}
        selectedEventId={selectedEventId}
        selectedEvent={selectedEvent}
        onChange={switchEvent}
      />

      {!selectedEventId ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-slate-900">Select an outreach event</div>
          <p className="mt-1 text-sm text-slate-600">You need an outreach context to continue.</p>
        </div>
      ) : null}

      {selectedEventId && !enabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="text-base font-semibold text-amber-900">Module disabled</div>
          <p className="mt-1 text-sm text-amber-900">This module was not activated for the selected outreach event.</p>
        </div>
      ) : null}

      {selectedEventId && enabled && !allowed ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="text-base font-semibold text-amber-900">Permission denied</div>
          <p className="mt-1 text-sm text-amber-900">You don’t have permission to access this module.</p>
        </div>
      ) : null}

      {selectedEventId && enabled && allowed ? (
        <PatientPicker eventId={selectedEventId} tabKey="eye_checks" />
      ) : null}
    </div>
  );
}
