// app/provider/encounters/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { pauseEncounter, resumeEncounter } from "@/lib/encounterActions";
import EncounterRelatedData from "@/components/encounters/EncounterRelatedData";

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

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function normalizeAttachmentsPayload(body) {
  if (!body) return [];

  // DRF paginated: { count, results: [...] }
  if (Array.isArray(body.results)) {
    return body.results;
  }

  // Plain list: [...]
  if (Array.isArray(body)) {
    return body;
  }

  // Weird numeric-key object from BFF spread
  if (body && typeof body === "object") {
    const numericKeys = Object.keys(body).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }

  return [];
}

function NoteBlock({ label, value, wide = false }) {
  const hasValue = Boolean(value && String(value).trim().length);

  return (
    <div
      className={
        wide
          ? "md:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
          : "rounded-xl border border-slate-100 bg-slate-50 p-3"
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
        {hasValue ? value : "—"}
      </div>
    </div>
  );
}

export default function ProviderEncounterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [me, setMe] = useState(null);

  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Status update state (pause/resume)
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");

  async function refreshEncounter() {
    if (!id) return;
    const data = await apiFetch(`/encounters/${id}/`, { method: "GET" });
    setEncounter(data);
  }

  async function handlePause() {
    if (!id) return;
    setStatusUpdateError("");
    setStatusUpdating(true);
    try {
      await pauseEncounter(id);
      await refreshEncounter();
    } catch (err) {
      setStatusUpdateError(err?.message || "Failed to pause encounter.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleResume() {
    if (!id) return;
    setStatusUpdateError("");
    setStatusUpdating(true);
    try {
      await resumeEncounter(id);
      await refreshEncounter();
    } catch (err) {
      setStatusUpdateError(err?.message || "Failed to resume encounter.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function openWorkflow() {
    if (!id) return;
    const statusUpper = String(encounter?.status || "").toUpperCase();
    const base = `/provider/encounters/${id}/workflow`;
    const target =
      statusUpper === "WAITING_LABS" ? `${base}/waiting-labs` : `${base}/labs`;
    router.push(target);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const data = await apiFetch(`/accounts/me/`, { method: "GET" });
        if (!cancelled) setMe(data || null);
      } catch {
        if (!cancelled) setMe(null);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load encounter itself
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadEncounter() {
      try {
        setLoading(true);
        setError("");

        const data = await apiFetch(`/encounters/${id}/`, {
          method: "GET",
        });

        if (cancelled) return;

        setEncounter(data);
      } catch (err) {
        console.error("Failed to load encounter", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load encounter details. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEncounter();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load attachments for this encounter
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadAttachments() {
      try {
        setAttachmentsLoading(true);
        setAttachmentsError("");

        const qs = new URLSearchParams();
        qs.set("owner_type", "encounter");
        qs.set("owner_id", String(id));

        const body = await apiFetch(`/attachments/?${qs.toString()}`, {
          method: "GET",
        });

        if (cancelled) return;

        const items = normalizeAttachmentsPayload(body);
        setAttachments(items);
      } catch (err) {
        console.error("Failed to load encounter attachments", err);
        if (!cancelled) {
          setAttachmentsError(
            err?.message || "Attachments could not be loaded for this encounter."
          );
          setAttachments([]);
        }
      } finally {
        if (!cancelled) {
          setAttachmentsLoading(false);
        }
      }
    }

    loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing encounter ID in URL.
        </div>
      </main>
    );
  }

  const patientName =
    encounter?.patient_name ||
    (encounter?.patient_first_name || encounter?.patient_last_name
      ? `${encounter?.patient_first_name || ""} ${
          encounter?.patient_last_name || ""
        }`.trim()
      : "") ||
    encounter?.patient ||
    "—";

  const facilityName =
    encounter?.facility_name || encounter?.facility?.name || "—";

  const providerName =
    encounter?.provider_name ||
    (encounter?.provider_first_name || encounter?.provider_last_name
      ? `${encounter?.provider_first_name || ""} ${
          encounter?.provider_last_name || ""
        }`.trim()
      : "") ||
    encounter?.provider ||
    "—";

  const createdByName =
    encounter?.created_by_name ||
    (encounter?.created_by_first_name || encounter?.created_by_last_name
      ? `${encounter?.created_by_first_name || ""} ${
          encounter?.created_by_last_name || ""
        }`.trim()
      : "") ||
    encounter?.created_by ||
    null;

  const locked = Boolean(encounter?.locked);
  const lockedAt = encounter?.locked_at || null;

  const clinicalFields = {
    chiefComplaint: encounter?.chief_complaint || encounter?.reason || "",
    hpi: encounter?.hpi || "",
    ros: encounter?.ros || "",
    exam: encounter?.physical_exam || "",
    diagnoses: encounter?.diagnoses || "",
    plan: encounter?.plan || "",
  };

  const statusUpper = String(encounter?.status || "").toUpperCase();
  const canPauseResume = ["OPEN", "IN_PROGRESS", "WAITING_LABS"].includes(
    statusUpper
  );

  const canOpenWorkflow = useMemo(() => {
    const role = String(me?.role || "").toUpperCase();
    return ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role);
  }, [me]);

  const workflowBtnLabel =
    statusUpper === "WAITING_LABS" ? "Go to Waiting Labs" : "Open Encounter Workflow";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* Header / breadcrumbs */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            Encounter details
          </h1>
          <p className="text-sm text-slate-600">
            Review the clinical note, context, timing and attachments for this
            encounter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canOpenWorkflow && (
            <button
              type="button"
              onClick={openWorkflow}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              title="Open encounter workflow (Labs → SOAP → Prescription)"
            >
              {workflowBtnLabel}
            </button>
          )}

          {canPauseResume &&
            (statusUpper === "WAITING_LABS" ? (
              <button
                type="button"
                onClick={handleResume}
                disabled={statusUpdating}
                className="inline-flex items-center rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
                title="Resume encounter"
              >
                {statusUpdating ? "Resuming…" : "Resume"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                disabled={statusUpdating}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                title="Pause encounter (e.g., waiting on labs)"
              >
                {statusUpdating ? "Pausing…" : "Pause"}
              </button>
            ))}

          {encounter?.status && (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                statusUpper === "OPEN" || statusUpper === "IN_PROGRESS"
                  ? "bg-emerald-50 text-emerald-700"
                  : statusUpper === "WAITING_LABS"
                  ? "bg-amber-50 text-amber-700"
                  : statusUpper === "CLOSED"
                  ? "bg-slate-100 text-slate-700"
                  : statusUpper === "CROSSED_OUT"
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-50 text-slate-600"
              }`}
            >
              {encounter.status}
            </span>
          )}
        </div>
      </div>

      {statusUpdateError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {statusUpdateError}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Loading encounter…
        </div>
      )}

      {!loading && !error && !encounter && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Encounter not found.
        </div>
      )}

      {!loading && encounter && (
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* High-level info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Patient
              </p>
              <p className="text-sm font-medium text-slate-900">{patientName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Facility
              </p>
              <p className="text-sm font-medium text-slate-900">{facilityName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Provider
              </p>
              <p className="text-sm font-medium text-slate-900">{providerName}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Visit date
              </p>
              <p className="text-sm font-medium text-slate-900">
                {formatDate(
                  encounter.occurred_at ||
                    encounter.encounter_date ||
                    encounter.start_at
                )}
              </p>
            </div>
          </div>

          {/* Timing & creator */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Started at
              </p>
              <p className="text-sm text-slate-900">
                {formatDateTime(
                  encounter.start_at || encounter.created_at || encounter.occurred_at
                )}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ended at
              </p>
              <p className="text-sm text-slate-900">
                {formatDateTime(encounter.end_at)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recorded by
              </p>
              <p className="text-sm text-slate-900">
                {createdByName || providerName || "—"}
              </p>
            </div>
          </div>

          {/* Clinical note (structured) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Clinical note
              </p>

              {locked && (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                  Locked{lockedAt ? ` · ${formatDateTime(lockedAt)}` : ""}
                </span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <NoteBlock
                label="Chief complaint"
                value={clinicalFields.chiefComplaint}
              />
              <NoteBlock label="Diagnoses" value={clinicalFields.diagnoses} />
              <NoteBlock label="HPI" value={clinicalFields.hpi} wide />
              <NoteBlock label="ROS" value={clinicalFields.ros} wide />
              <NoteBlock label="Physical exam" value={clinicalFields.exam} wide />
              <NoteBlock label="Plan" value={clinicalFields.plan} wide />
            </div>

            {!clinicalFields.chiefComplaint &&
              !clinicalFields.hpi &&
              !clinicalFields.ros &&
              !clinicalFields.exam &&
              !clinicalFields.diagnoses &&
              !clinicalFields.plan && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                  No clinical note recorded for this encounter yet.
                </div>
              )}
          </div>

          {/* Attachments section */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attachments
            </p>

            {attachmentsLoading && (
              <p className="text-xs text-slate-500">Loading attachments…</p>
            )}

            {attachmentsError && (
              <p className="text-xs text-red-600">{attachmentsError}</p>
            )}

            {!attachmentsLoading &&
              !attachmentsError &&
              attachments.length === 0 && (
                <p className="text-xs text-slate-500">
                  No files attached to this encounter yet.
                </p>
              )}

            {!attachmentsLoading && attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((att) => {
                  const fileUrl = att.file || att.url || att.download_url || "#";

                  const nameFromPath =
                    typeof att.file === "string"
                      ? att.file.split("/").slice(-1)[0]
                      : null;

                  const label =
                    att.filename ||
                    att.name ||
                    nameFromPath ||
                    `Attachment #${att.id}`;

                  return (
                    <li
                      key={att.id || `${label}-${fileUrl}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {label}
                        </span>
                        {att.description && (
                          <span className="mt-0.5 text-[11px] text-slate-600">
                            {att.description}
                          </span>
                        )}
                        {att.created_at && (
                          <span className="mt-0.5 text-[11px] text-slate-500">
                            Uploaded {formatDateTime(att.created_at)}
                          </span>
                        )}
                      </div>
                      {fileUrl && fileUrl !== "#" && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          Open
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Related orders & prescriptions */}
          <EncounterRelatedData encounter={encounter} context="provider" />

          {/* Linked appointment (if any) */}
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Linked appointment
              </p>
              {encounter.appointment_id ? (
                <p className="text-sm text-blue-700">
                  Appointment #{encounter.appointment_id}
                </p>
              ) : (
                <p className="text-sm text-slate-500">None</p>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <Link
              href="/provider/encounters"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to encounters list
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
