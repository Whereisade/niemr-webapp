"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  Lock,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;

  // "numeric-key object" fallback (some BFF routes spread arrays)
  if (typeof data === "object") {
    const keys = Object.keys(data).filter((k) => /^\d+$/.test(k));
    if (keys.length) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data[k])
        .filter(Boolean);
    }
  }

  return [];
}

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  const map = {
    OPEN: "bg-slate-50 text-slate-700 ring-slate-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
    WAITING_LABS: "bg-amber-50 text-amber-800 ring-amber-200",
    CLOSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CROSSED_OUT: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return map[s] || "bg-slate-50 text-slate-700 ring-slate-200";
}

function stageBadge(stage) {
  const s = String(stage || "").toUpperCase();
  const map = {
    LABS: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    WAITING_LABS: "bg-amber-50 text-amber-800 ring-amber-200",
    NOTE: "bg-blue-50 text-blue-700 ring-blue-200",
    PRESCRIPTION: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return map[s] || "bg-slate-50 text-slate-700 ring-slate-200";
}

export default function PatientEncounterListModal({
  open,
  onClose,
  patientId,
  patientName,
  scope = "facility",
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const encounters = useMemo(() => normalizeList(payload), [payload]);

  useEffect(() => {
    if (!open || !patientId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        // Backend orders by -occurred_at, -id by default
        const data = await apiFetch(`/encounters/?patient=${patientId}`);
        if (cancelled) return;
        setPayload(data);
      } catch (err) {
        console.error("Failed to load patient encounters", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load encounters for this patient. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, patientId]);

  if (!open) return null;

  const basePath = scope === "provider" ? "/provider" : "/facility";

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const goToEncounter = (encounterId) => {
    router.push(`${basePath}/encounters/${encounterId}`);
    onClose?.();
  };

  const startWalkInEncounter = async () => {
    if (!patientId || starting) return;

    try {
      setStarting(true);
      setError("");

      const enc = await apiFetch(`/encounters/start-from-patient/`, {
        method: "POST",
        body: JSON.stringify({ patient_id: patientId }),
      });

      const encounterId = enc?.id;
      if (!encounterId) throw new Error("No encounter ID returned from server");

      // Refresh list (best effort)
      try {
        const data = await apiFetch(`/encounters/?patient=${patientId}`);
        setPayload(data);
      } catch {
        // ignore
      }

      const status = String(enc?.status || "").toUpperCase();
      const stage = String(enc?.stage || "").toUpperCase();

      if (status === "WAITING_LABS" || stage === "WAITING_LABS") {
        router.push(`${basePath}/encounters/${encounterId}/workflow/waiting-labs`);
      } else {
        router.push(`${basePath}/encounters/${encounterId}/workflow/nurse`);
      }

      onClose?.();
    } catch (err) {
      console.error("Failed to start walk-in encounter", err);
      setError(err?.message || "Failed to start encounter. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const title = patientName ? `Encounters • ${patientName}` : "Patient encounters";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/20">
        {/* Header */}
        <div className="relative border-b border-slate-200/80">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 border border-slate-200">
                <Stethoscope className="h-4 w-4 text-slate-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                <p className="text-xs text-slate-500">
                  Recent clinical encounters recorded in this facility.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startWalkInEncounter}
                disabled={starting}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Start a new walk-in encounter for this patient"
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                Start encounter
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              Loading encounters…
            </div>
          )}

          {error && (
            <div className="mb-3 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && encounters.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              No encounters found for this patient yet.
            </div>
          )}

          {encounters.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      When
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Stage
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Nurse
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Provider
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Summary
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {encounters.map((enc) => {
                    const nurse = enc.nurse_name || (enc.nurse ? `User #${enc.nurse}` : "—");
                    const provider = enc.provider_name || (enc.provider ? `User #${enc.provider}` : "—");
                    const summary =
                      enc.chief_complaint || enc.diagnoses || enc.plan || "—";

                    return (
                      <tr key={enc.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium text-slate-900">
                            {formatDateTime(enc.occurred_at)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Encounter #{enc.id}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusBadge(
                              enc.status
                            )}`}
                          >
                            {enc.status || "—"}
                          </span>
                          {enc.locked && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 align-top">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${stageBadge(
                              enc.stage
                            )}`}
                          >
                            {enc.stage || "—"}
                          </span>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-50 border border-slate-200">
                              <UserRound className="h-3.5 w-3.5 text-slate-600" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900">
                                {nurse}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="truncate font-medium text-slate-900">
                            {provider}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <div className="line-clamp-2 max-w-[420px] text-slate-700">
                            {summary}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-top text-right">
                          <button
                            type="button"
                            onClick={() => goToEncounter(enc.id)}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
