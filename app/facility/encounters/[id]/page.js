// app/facility/encounters/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { pauseEncounter, resumeEncounter } from "@/lib/encounterActions";
import EncounterRelatedData from "@/components/encounters/EncounterRelatedData";
import DownloadReportButton from "@/components/DownloadReportButton";
import {
  Activity,
  Stethoscope,
  UserRound,
  Calendar,
  Clock,
  AlertCircle,
  Lock,
  FileText,
  Paperclip,
  Building2,
  Thermometer,
  HeartPulse,
  Droplets,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Beaker,
  Pill,
  ArrowLeft,
  Edit,
  Eye,
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
  if (Array.isArray(body.results)) return body.results;
  if (Array.isArray(body)) return body;
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

function StatusBadge({ status }) {
  const statusUpper = String(status || "").toUpperCase();
  
  const statusConfig = {
    OPEN: { 
      bg: "bg-emerald-50", 
      text: "text-emerald-700", 
      ring: "ring-emerald-200",
      icon: Activity,
      label: "Open" 
    },
    IN_PROGRESS: { 
      bg: "bg-blue-50", 
      text: "text-blue-700", 
      ring: "ring-blue-200",
      icon: Activity,
      label: "In Progress" 
    },
    WAITING_LABS: { 
      bg: "bg-amber-50", 
      text: "text-amber-700", 
      ring: "ring-amber-200",
      icon: Beaker,
      label: "Waiting Labs" 
    },
    CLOSED: { 
      bg: "bg-slate-100", 
      text: "text-slate-700", 
      ring: "ring-slate-300",
      icon: CheckCircle2,
      label: "Closed" 
    },
    CROSSED_OUT: { 
      bg: "bg-red-50", 
      text: "text-red-700", 
      ring: "ring-red-200",
      icon: XCircle,
      label: "Crossed Out" 
    },
  };

  const config = statusConfig[statusUpper] || { 
    bg: "bg-slate-50", 
    text: "text-slate-600", 
    ring: "ring-slate-200",
    icon: Activity,
    label: status || "Unknown" 
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ${config.bg} ${config.text} ${config.ring}`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
}

function StageBadge({ stage }) {
  const stageUpper = String(stage || "").toUpperCase();
  
  const stageConfig = {
    TRIAGE: { bg: "bg-purple-50", text: "text-purple-700", label: "Triage" },
    LABS: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Labs" },
    WAITING_LABS: { bg: "bg-amber-50", text: "text-amber-700", label: "Waiting Labs" },
    NOTE: { bg: "bg-indigo-50", text: "text-indigo-700", label: "Clinical Note" },
    PRESCRIPTION: { bg: "bg-pink-50", text: "text-pink-700", label: "Prescription" },
  };

  const config = stageConfig[stageUpper] || { 
    bg: "bg-slate-50", 
    text: "text-slate-600", 
    label: stage || "—" 
  };

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const priorityUpper = String(priority || "").toUpperCase();
  
  const priorityConfig = {
    ROUTINE: { bg: "bg-slate-50", text: "text-slate-600", label: "Routine" },
    URGENT: { bg: "bg-orange-50", text: "text-orange-700", label: "Urgent" },
    STAT: { bg: "bg-red-50", text: "text-red-700", label: "STAT" },
  };

  const config = priorityConfig[priorityUpper] || { 
    bg: "bg-slate-50", 
    text: "text-slate-600", 
    label: priority || "—" 
  };

  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const typeUpper = String(type || "").toUpperCase();
  
  const typeConfig = {
    NEW: { label: "New Visit" },
    FOLLOW_UP: { label: "Follow-up" },
    VIRTUAL: { label: "Virtual" },
  };

  const config = typeConfig[typeUpper] || { label: type || "—" };

  return (
    <span className="inline-flex items-center rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
      {config.label}
    </span>
  );
}

function InfoCard({ icon: Icon, label, value, subValue, color = "text-slate-600" }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{value || "—"}</p>
        {subValue && (
          <p className="mt-0.5 text-xs text-slate-500">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function TimelineEvent({ icon: Icon, title, timestamp, detail, color = "text-slate-600" }) {
  if (!timestamp) return null;

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(timestamp)}</p>
        {detail && (
          <p className="mt-1 text-xs text-slate-600">{detail}</p>
        )}
      </div>
    </div>
  );
}

function SoapSection({ label, content, icon: Icon }) {
  const hasContent = Boolean(content && String(content).trim().length);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
        {hasContent ? content : <span className="text-slate-400 italic">Not recorded</span>}
      </div>
    </div>
  );
}

export default function FacilityEncounterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [me, setMe] = useState(null);
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");

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

  function openWorkflow() {
    if (!id) return;
    const statusUpper = String(encounter?.status || "").toUpperCase();
    const base = `/facility/encounters/${id}/workflow`;
    const roleUpper = String(me?.role || "").toUpperCase();

    if (statusUpper === "WAITING_LABS") {
      router.push(`${base}/waiting-labs`);
    } else if (roleUpper === "DOCTOR") {
      router.push(`${base}/clinical`);
    } else {
      router.push(`${base}/nurse`);
    }
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
        console.error("Failed to load facility encounter", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load encounter details. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEncounter();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        console.error("Failed to load facility encounter attachments", err);
        if (!cancelled) {
          setAttachmentsError(
            err?.message || "Attachments could not be loaded for this encounter."
          );
          setAttachments([]);
        }
      } finally {
        if (!cancelled) setAttachmentsLoading(false);
      }
    }

    loadAttachments();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
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
    "Unknown Patient";

  const facilityName = encounter?.facility_name || "—";
  const nurseName = encounter?.nurse_name || null;
  const providerName = encounter?.provider_name || null;
  const createdByName = encounter?.created_by_name || null;

  const locked = Boolean(encounter?.locked);
  const lockedAt = encounter?.locked_at || null;
  const lockDueAt = encounter?.lock_due_at || null;

  const statusUpper = String(encounter?.status || "").toUpperCase();

  const canPauseResume = ["OPEN", "IN_PROGRESS", "WAITING_LABS"].includes(statusUpper);

  const canOpenWorkflow = useMemo(() => {
    const role = String(me?.role || "").toUpperCase();
    return ["DOCTOR", "NURSE"].includes(role);
  }, [me]);

  const role = String(me?.role || "").toUpperCase();
  const isNurse = role === "NURSE";

  const workflowBtnLabel =
    statusUpper === "WAITING_LABS" 
      ? "Go to Waiting Labs" 
      : isNurse 
        ? "Open Nurse Workflow"
        : "Open Encounter Workflow";

  // Get patient initials for avatar
  const patientInitials = patientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Encounter Details
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>Encounter #{id}</span>
              <span>•</span>
              <span>{formatDate(encounter?.occurred_at)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {encounter?.status && <StatusBadge status={encounter.status} />}
            {encounter?.stage && <StageBadge stage={encounter.stage} />}
            {encounter?.priority && <PriorityBadge priority={encounter.priority} />}
            {encounter?.encounter_type && <TypeBadge type={encounter.encounter_type} />}
            {locked && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300">
                <Lock className="h-4 w-4" />
                Locked
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canOpenWorkflow && (
            <button
              type="button"
              onClick={openWorkflow}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              title="Open encounter workflow"
            >
              <Edit className="h-4 w-4" />
              {workflowBtnLabel}
            </button>
          )}

          {canPauseResume &&
            (statusUpper === "WAITING_LABS" ? (
              <button
                type="button"
                onClick={handleResume}
                disabled={statusUpdating}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
                title="Resume encounter"
              >
                {statusUpdating ? "Resuming…" : <><Play className="h-4 w-4" /> Resume</>}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                disabled={statusUpdating}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                title="Pause encounter"
              >
                {statusUpdating ? "Pausing…" : <><Pause className="h-4 w-4" /> Pause</>}
              </button>
            ))}

          <DownloadReportButton
            type="encounter"
            refId={encounter?.reference || encounter?.ref || encounter?.id}
          />
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
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-600 shadow-sm">
          <div className="inline-flex h-8 w-8 animate-spin items-center justify-center rounded-full border-2 border-slate-200 border-t-slate-900"></div>
          <p className="mt-3">Loading encounter…</p>
        </div>
      )}

      {!loading && !error && !encounter && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">Encounter not found.</p>
        </div>
      )}

      {!loading && encounter && (
        <>
          {/* Patient & Provider Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Patient Card */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
                  {patientInitials || <UserRound className="h-8 w-8" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-500">Patient</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 truncate">{patientName}</p>
                  {encounter?.patient && (
                    <p className="mt-1 text-xs text-slate-500">ID: {encounter.patient}</p>
                  )}
                  <Link
                    href={`/facility/patients/${encounter?.patient}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="h-4 w-4" />
                    View Patient Record
                  </Link>
                </div>
              </div>
            </div>

            {/* Clinical Team Card */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Clinical Team</p>
              
              <div className="mt-4 space-y-3">
                {nurseName && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <Activity className="h-5 w-5 text-purple-700" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Nurse</p>
                      <p className="text-sm font-semibold text-slate-900">{nurseName}</p>
                    </div>
                  </div>
                )}

                {providerName && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                      <Stethoscope className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Provider (Doctor)</p>
                      <p className="text-sm font-semibold text-slate-900">{providerName}</p>
                    </div>
                  </div>
                )}

                {!nurseName && !providerName && (
                  <p className="text-sm text-slate-500 italic">No clinical team assigned yet</p>
                )}

                {createdByName && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-500">Created by</p>
                    <p className="text-sm text-slate-700">{createdByName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visit Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Calendar className="h-5 w-5 text-slate-400" />
              Visit Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                icon={Building2}
                label="Facility"
                value={facilityName}
                color="text-indigo-600"
              />
              <InfoCard
                icon={Calendar}
                label="Visit Date"
                value={formatDate(encounter?.occurred_at)}
                subValue={formatDateTime(encounter?.occurred_at)}
                color="text-blue-600"
              />
              <InfoCard
                icon={Clock}
                label="Duration"
                value={
                  encounter?.duration_value && encounter?.duration_unit
                    ? `${encounter.duration_value} ${encounter.duration_unit}`
                    : "—"
                }
                color="text-purple-600"
              />
              {encounter?.appointment_id && (
                <InfoCard
                  icon={FileText}
                  label="Appointment"
                  value={`#${encounter.appointment_id}`}
                  color="text-pink-600"
                />
              )}
              <InfoCard
                icon={Clock}
                label="Created At"
                value={formatDateTime(encounter?.created_at)}
                color="text-slate-600"
              />
              <InfoCard
                icon={Clock}
                label="Last Updated"
                value={formatDateTime(encounter?.updated_at)}
                color="text-slate-600"
              />
            </div>
          </div>

          {/* Chief Complaint */}
          {encounter?.chief_complaint && (
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500">Chief Complaint / Reason for Visit</p>
                  <p className="mt-1 text-base text-slate-900">{encounter.chief_complaint}</p>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Documentation (SOAP Notes) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-slate-400" />
                Clinical Documentation
              </h2>

              {locked && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <Lock className="h-4 w-4" />
                  Locked
                  {lockedAt && <span className="text-slate-500">• {formatDateTime(lockedAt)}</span>}
                </div>
              )}

              {lockDueAt && !locked && (
                <div className="text-xs text-slate-500">
                  Lock due: {formatDateTime(lockDueAt)}
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SoapSection
                label="History of Present Illness (HPI)"
                content={encounter?.hpi}
                icon={FileText}
              />
              <SoapSection
                label="Review of Systems (ROS)"
                content={encounter?.ros}
                icon={FileText}
              />
              <SoapSection
                label="Physical Examination"
                content={encounter?.physical_exam}
                icon={Thermometer}
              />
              <SoapSection
                label="Diagnoses / Assessment"
                content={encounter?.diagnoses}
                icon={Stethoscope}
              />
              <div className="lg:col-span-2">
                <SoapSection
                  label="Plan / Treatment"
                  content={encounter?.plan}
                  icon={CheckCircle2}
                />
              </div>
            </div>

            {!encounter?.hpi &&
              !encounter?.ros &&
              !encounter?.physical_exam &&
              !encounter?.diagnoses &&
              !encounter?.plan && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    No clinical documentation recorded yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Clinical notes will appear here once the provider completes the SOAP documentation
                  </p>
                </div>
              )}
          </div>

          {/* Timeline */}
          {(encounter?.paused_at ||
            encounter?.resumed_at ||
            encounter?.labs_skipped_at ||
            encounter?.clinical_finalized_at) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Clock className="h-5 w-5 text-slate-400" />
                Encounter Timeline
              </h2>

              <div className="space-y-0 border-l-2 border-slate-200 pl-4">
                <TimelineEvent
                  icon={Activity}
                  title="Encounter Started"
                  timestamp={encounter?.occurred_at || encounter?.created_at}
                  detail={createdByName ? `By ${createdByName}` : undefined}
                  color="text-emerald-600"
                />

                {encounter?.paused_at && (
                  <TimelineEvent
                    icon={Pause}
                    title="Paused (Waiting for Labs)"
                    timestamp={encounter.paused_at}
                    detail={encounter?.paused_by ? `By ${encounter.paused_by}` : undefined}
                    color="text-amber-600"
                  />
                )}

                {encounter?.resumed_at && (
                  <TimelineEvent
                    icon={Play}
                    title="Resumed"
                    timestamp={encounter.resumed_at}
                    detail={encounter?.resumed_by ? `By ${encounter.resumed_by}` : undefined}
                    color="text-blue-600"
                  />
                )}

                {encounter?.labs_skipped_at && (
                  <TimelineEvent
                    icon={Beaker}
                    title="Labs Skipped"
                    timestamp={encounter.labs_skipped_at}
                    detail={encounter?.labs_skipped_by ? `By ${encounter.labs_skipped_by}` : undefined}
                    color="text-orange-600"
                  />
                )}

                {encounter?.clinical_finalized_at && (
                  <TimelineEvent
                    icon={CheckCircle2}
                    title="Clinical Documentation Finalized"
                    timestamp={encounter.clinical_finalized_at}
                    detail={encounter?.clinical_finalized_by ? `By ${encounter.clinical_finalized_by}` : "Lock countdown started"}
                    color="text-purple-600"
                  />
                )}

                {encounter?.locked_at && (
                  <TimelineEvent
                    icon={Lock}
                    title="Note Locked"
                    timestamp={encounter.locked_at}
                    detail="Clinical documentation is now immutable"
                    color="text-slate-600"
                  />
                )}
              </div>
            </div>
          )}

          {/* Related Orders & Prescriptions */}
          <EncounterRelatedData encounter={encounter} context="facility" />

          {/* Attachments */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">Attachments</h2>
            </div>

            {attachmentsLoading && (
              <p className="text-sm text-slate-500">Loading attachments…</p>
            )}

            {attachmentsError && (
              <p className="text-sm text-red-600">{attachmentsError}</p>
            )}

            {!attachmentsLoading && !attachmentsError && attachments.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Paperclip className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm text-slate-600">
                  No files attached to this encounter yet
                </p>
              </div>
            )}

            {!attachmentsLoading && attachments.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {attachments.map((att) => {
                  const fileUrl = att.file || att.url || att.download_url || "#";

                  const nameFromPath =
                    typeof att.file === "string" ? att.file.split("/").slice(-1)[0] : null;

                  const label =
                    att.filename || att.name || nameFromPath || `Attachment #${att.id}`;

                  return (
                    <div
                      key={att.id || `${label}-${fileUrl}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 hover:bg-slate-100"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{label}</span>
                        </div>
                        {att.description && (
                          <span className="mt-1 text-xs text-slate-600">
                            {att.description}
                          </span>
                        )}
                        {att.created_at && (
                          <span className="mt-1 text-xs text-slate-500">
                            {formatDateTime(att.created_at)}
                          </span>
                        )}
                      </div>
                      {fileUrl && fileUrl !== "#" && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Open
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}