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
  Shield, // ✅ NEW: for HMO badge
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

function calculateEncounterDuration(encounter) {
  if (!encounter) return null;

  const startTime = new Date(encounter.occurred_at || encounter.created_at);
  if (isNaN(startTime.getTime())) return null;

  // End time is when clinical documentation was finalized, or now if still ongoing
  let endTime;
  if (encounter.clinical_finalized_at) {
    endTime = new Date(encounter.clinical_finalized_at);
  } else {
    endTime = new Date(); // Current time for ongoing encounters
  }

  if (isNaN(endTime.getTime())) return null;

  // Calculate total duration in minutes
  let totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));

  // Subtract paused time if applicable
  if (encounter.paused_at && encounter.resumed_at) {
    const pausedStart = new Date(encounter.paused_at);
    const pausedEnd = new Date(encounter.resumed_at);
    if (!isNaN(pausedStart.getTime()) && !isNaN(pausedEnd.getTime())) {
      const pausedMinutes = Math.floor((pausedEnd - pausedStart) / (1000 * 60));
      totalMinutes -= pausedMinutes;
    }
  } else if (encounter.paused_at && !encounter.resumed_at) {
    // Still paused - don't count time from pause to now
    const pausedStart = new Date(encounter.paused_at);
    if (!isNaN(pausedStart.getTime())) {
      const pausedMinutes = Math.floor((endTime - pausedStart) / (1000 * 60));
      totalMinutes -= pausedMinutes;
    }
  }

  // Format the duration nicely
  if (totalMinutes < 0) totalMinutes = 0;

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  } else if (totalMinutes < 1440) {
    // Less than 24 hours
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
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

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (typeof data === "object") {
    const keys = Object.keys(data).filter((k) => String(Number(k)) === k);
    if (keys.length) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => data[k]);
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
      label: "Open",
    },
    IN_PROGRESS: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      ring: "ring-blue-200",
      icon: Activity,
      label: "In Progress",
    },
    WAITING_LABS: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
      icon: Beaker,
      label: "Waiting Labs",
    },
    CLOSED: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      ring: "ring-slate-300",
      icon: CheckCircle2,
      label: "Closed",
    },
    CROSSED_OUT: {
      bg: "bg-red-50",
      text: "text-red-700",
      ring: "ring-red-200",
      icon: XCircle,
      label: "Crossed Out",
    },
  };

  const config = statusConfig[statusUpper] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    ring: "ring-slate-200",
    icon: Activity,
    label: status || "Unknown",
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ${config.bg} ${config.text} ${config.ring}`}
    >
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
    WAITING_LABS: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      label: "Waiting Labs",
    },
    NOTE: { bg: "bg-indigo-50", text: "text-indigo-700", label: "Clinical Note" },
    PRESCRIPTION: { bg: "bg-pink-50", text: "text-pink-700", label: "Prescription" },
  };

  const config = stageConfig[stageUpper] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    label: stage || "—",
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
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
    label: priority || "—",
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
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
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
          {value || "—"}
        </p>
        {subValue && <p className="mt-0.5 text-xs text-slate-500">{subValue}</p>}
      </div>
    </div>
  );
}

function TimelineEvent({ icon: Icon, title, timestamp, detail, color = "text-slate-600" }) {
  if (!timestamp) return null;

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-50 ${color}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(timestamp)}</p>
        {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
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

  // Lab orders state
  const [labOrders, setLabOrders] = useState([]);
  const [labOrdersLoading, setLabOrdersLoading] = useState(false);
  const [labOrdersError, setLabOrdersError] = useState("");

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [prescriptionsError, setPrescriptionsError] = useState("");

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");

  // ✅ NEW: Patient insurance (HMO + Tier)
  const [insuranceInfo, setInsuranceInfo] = useState({ hmoName: "", tierName: "" });
  const [insuranceLoading, setInsuranceLoading] = useState(false);

  // Live duration update for ongoing encounters
  const [, setDurationTick] = useState(0);

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
          setError(err?.message || "Failed to load encounter details. Please try again.");
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

  // ✅ NEW: Load patient insurance (SystemHMO + Tier) for display beside patient name
  useEffect(() => {
    const patientId = encounter?.patient;
    if (!patientId) {
      // fallback: if encounter already has insurance fields (rare), still try to show them
      const fallbackHmo =
        encounter?.system_hmo_name ||
        encounter?.hmo_name ||
        encounter?.patient_hmo_name ||
        encounter?.patient_system_hmo_name ||
        "";
      const fallbackTier =
        encounter?.hmo_tier_name ||
        encounter?.tier_name ||
        encounter?.patient_hmo_tier_name ||
        "";
      setInsuranceInfo({ hmoName: fallbackHmo || "", tierName: fallbackTier || "" });
      return;
    }

    let cancelled = false;

    async function loadInsurance() {
      setInsuranceLoading(true);
      try {
        const p = await apiFetch(`/patients/${patientId}/`, { method: "GET" });

        // system_hmo can be object or id
        let systemHmoObj = p?.system_hmo || null;
        let systemHmoId =
          typeof systemHmoObj === "object" ? systemHmoObj?.id : systemHmoObj;

        // If it's just an ID, lookup name via dropdown (only if needed)
        if (systemHmoId && typeof systemHmoObj !== "object") {
          const dropdown = await apiFetch(`/patients/hmo/system/dropdown/`, {
            method: "GET",
          }).catch(() => []);
          if (Array.isArray(dropdown)) {
            systemHmoObj = dropdown.find((h) => h.id === Number(systemHmoId)) || null;
          }
        }

        // tier can be object or id; if id, try to map from systemHmoObj.tiers
        let tierObj = p?.hmo_tier || null;
        let tierId = typeof tierObj === "object" ? tierObj?.id : tierObj;

        if (tierId && typeof tierObj !== "object") {
          const tiers = systemHmoObj?.tiers || [];
          if (Array.isArray(tiers)) {
            tierObj = tiers.find((t) => t.id === Number(tierId)) || null;
          }
        }

        const hmoName =
          (typeof systemHmoObj === "object" ? systemHmoObj?.name : "") || "";
        const tierName =
          (typeof tierObj === "object" ? tierObj?.name : "") ||
          (typeof tierObj === "string" ? tierObj : "") ||
          "";

        if (!cancelled) {
          setInsuranceInfo({ hmoName, tierName });
        }
      } catch (e) {
        // don't block page if insurance can't load
        if (!cancelled) {
          const fallbackHmo =
            encounter?.system_hmo_name ||
            encounter?.hmo_name ||
            encounter?.patient_hmo_name ||
            encounter?.patient_system_hmo_name ||
            "";
          const fallbackTier =
            encounter?.hmo_tier_name ||
            encounter?.tier_name ||
            encounter?.patient_hmo_tier_name ||
            "";
          setInsuranceInfo({ hmoName: fallbackHmo || "", tierName: fallbackTier || "" });
        }
      } finally {
        if (!cancelled) setInsuranceLoading(false);
      }
    }

    loadInsurance();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounter?.patient]);

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

  // Load lab orders
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadLabOrders() {
      try {
        setLabOrdersLoading(true);
        setLabOrdersError("");

        const body = await apiFetch(`/labs/orders/?encounter=${id}`, {
          method: "GET",
        });

        if (cancelled) return;

        const items = normalizeList(body);
        setLabOrders(items);
      } catch (err) {
        console.error("Failed to load lab orders", err);
        if (!cancelled) {
          setLabOrdersError(err?.message || "Lab orders could not be loaded.");
          setLabOrders([]);
        }
      } finally {
        if (!cancelled) setLabOrdersLoading(false);
      }
    }

    loadLabOrders();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load prescriptions
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadPrescriptions() {
      try {
        setPrescriptionsLoading(true);
        setPrescriptionsError("");

        const body = await apiFetch(`/pharmacy/prescriptions/?encounter=${id}`, {
          method: "GET",
        });

        if (cancelled) return;

        const items = normalizeList(body);
        setPrescriptions(items);
      } catch (err) {
        console.error("Failed to load prescriptions", err);
        if (!cancelled) {
          setPrescriptionsError(err?.message || "Prescriptions could not be loaded.");
          setPrescriptions([]);
        }
      } finally {
        if (!cancelled) setPrescriptionsLoading(false);
      }
    }

    loadPrescriptions();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Update duration display every minute for ongoing encounters
  useEffect(() => {
    const isOngoing =
      encounter &&
      !encounter.clinical_finalized_at &&
      encounter.status !== "COMPLETED" &&
      encounter.status !== "CROSSED_OUT";

    if (!isOngoing) return;

    const interval = setInterval(() => {
      setDurationTick((prev) => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [encounter]);

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
      ? `${encounter?.patient_first_name || ""} ${encounter?.patient_last_name || ""}`.trim()
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

  const insuranceBadgeText =
    insuranceInfo?.hmoName
      ? `HMO: ${insuranceInfo.hmoName}${insuranceInfo?.tierName ? ` • ${insuranceInfo.tierName}` : ""}`
      : "";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 md:p-10">
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

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          {canOpenWorkflow && (
            <button
              type="button"
              onClick={openWorkflow}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 sm:w-auto"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60 sm:w-auto"
                title="Resume encounter"
              >
                {statusUpdating ? (
                  "Resuming…"
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Resume
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                disabled={statusUpdating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                title="Pause encounter"
              >
                {statusUpdating ? (
                  "Pausing…"
                ) : (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                )}
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

                  {/* ✅ UPDATED: Name row now includes insurance info beside it */}
                  <div className="mt-1 flex flex-wrap items-center gap-2 min-w-0">
                    <p className="text-lg font-bold text-slate-900 truncate">{patientName}</p>

                    {insuranceLoading ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
                        Loading insurance…
                      </span>
                    ) : insuranceBadgeText ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        <Shield className="h-3.5 w-3.5" />
                        {insuranceBadgeText}
                      </span>
                    ) : null}
                  </div>

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
                  <p className="text-sm text-slate-500 italic">
                    No clinical team assigned yet
                  </p>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Calendar className="h-5 w-5 text-slate-400" />
              Visit Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard icon={Building2} label="Facility" value={facilityName} color="text-indigo-600" />
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
                  calculateEncounterDuration(encounter) ||
                  (encounter?.duration_value && encounter?.duration_unit
                    ? `${encounter.duration_value} ${encounter.duration_unit}`
                    : "—")
                }
                subValue={
                  !encounter?.clinical_finalized_at &&
                  encounter?.status !== "COMPLETED" &&
                  encounter?.status !== "CROSSED_OUT"
                    ? "⏱️ Ongoing"
                    : encounter?.clinical_finalized_at
                    ? "✓ Completed"
                    : null
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
              <InfoCard icon={Clock} label="Created At" value={formatDateTime(encounter?.created_at)} color="text-slate-600" />
              <InfoCard icon={Clock} label="Last Updated" value={formatDateTime(encounter?.updated_at)} color="text-slate-600" />
            </div>
          </div>

          {/* Chief Complaint */}
          {encounter?.chief_complaint && (
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Chief Complaint / Reason for Visit
                  </p>
                  <p className="mt-1 text-base text-slate-900">{encounter.chief_complaint}</p>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Documentation (SOAP Notes) */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-slate-400" />
                Clinical Documentation
              </h2>

              {locked && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <Lock className="h-4 w-4" />
                  Locked
                  {lockedAt && (
                    <span className="text-slate-500">• {formatDateTime(lockedAt)}</span>
                  )}
                </div>
              )}

              {lockDueAt && !locked && (
                <div className="text-xs text-slate-500">Lock due: {formatDateTime(lockDueAt)}</div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SoapSection label="History of Present Illness (HPI)" content={encounter?.hpi} icon={FileText} />
              <SoapSection label="Review of Systems (ROS)" content={encounter?.ros} icon={FileText} />
              <SoapSection label="Physical Examination" content={encounter?.physical_exam} icon={Thermometer} />
              <SoapSection label="Diagnoses / Assessment" content={encounter?.diagnoses} icon={Stethoscope} />
              <div className="lg:col-span-2">
                <SoapSection label="Plan / Treatment" content={encounter?.plan} icon={CheckCircle2} />
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

          {/* Lab Orders Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Beaker className="h-5 w-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-slate-900">Lab Orders</h2>
            </div>

            {labOrdersLoading && <p className="text-sm text-slate-500">Loading lab orders…</p>}

            {labOrdersError && <p className="text-sm text-red-600">{labOrdersError}</p>}

            {!labOrdersLoading && !labOrdersError && labOrders.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Beaker className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm text-slate-600">No lab orders for this encounter yet</p>
              </div>
            )}

            {!labOrdersLoading && labOrders.length > 0 && (
              <div className="space-y-4">
                {labOrders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Lab Order #{order.id}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              order.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : order.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {order.status || "Unknown"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          {order.priority && (
                            <>
                              <span>Priority: {order.priority}</span>
                              <span>•</span>
                            </>
                          )}
                          {order.ordered_by_name && (
                            <>
                              <span>Ordered by: {order.ordered_by_name}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{formatDateTime(order.created_at)}</span>
                        </div>
                      </div>
                      <Link
                        href={`/facility/labs/${order.id}`}
                        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Link>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <>
                      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                            <tr>
                              <th className="px-3 py-2">Test Name</th>
                              <th className="px-3 py-2">Result</th>
                              <th className="px-3 py-2">Unit</th>
                              <th className="px-3 py-2">Flag</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.items.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  {item.display_name ||
                                    item.requested_name ||
                                    item.test?.name ||
                                    "—"}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {item.result_value != null ? item.result_value : item.result_text || "—"}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {item.result_unit || item.test?.unit || "—"}
                                </td>
                                <td className="px-3 py-2">
                                  {item.flag ? (
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        item.flag === "HIGH" || item.flag === "H"
                                          ? "bg-red-100 text-red-700"
                                          : item.flag === "LOW" || item.flag === "L"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {item.flag}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-600">{item.status || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="space-y-2 lg:hidden">
                        {order.items.map((item, idx) => (
                          <div key={item.id || idx} className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {item.display_name || item.requested_name || item.test?.name || "—"}
                            </p>
                            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                              <p><span className="font-medium text-slate-700">Result:</span> {item.result_value != null ? item.result_value : item.result_text || "—"}</p>
                              <p><span className="font-medium text-slate-700">Unit:</span> {item.result_unit || item.test?.unit || "—"}</p>
                              <p>
                                <span className="font-medium text-slate-700">Flag:</span>{" "}
                                {item.flag ? (
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.flag === "HIGH" || item.flag === "H"
                                        ? "bg-red-100 text-red-700"
                                        : item.flag === "LOW" || item.flag === "L"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {item.flag}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </p>
                              <p><span className="font-medium text-slate-700">Status:</span> {item.status || "—"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prescriptions Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Prescriptions</h2>
            </div>

            {prescriptionsLoading && <p className="text-sm text-slate-500">Loading prescriptions…</p>}

            {prescriptionsError && <p className="text-sm text-red-600">{prescriptionsError}</p>}

            {!prescriptionsLoading && !prescriptionsError && prescriptions.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Pill className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm text-slate-600">No prescriptions for this encounter yet</p>
              </div>
            )}

            {!prescriptionsLoading && prescriptions.length > 0 && (
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Prescription #{prescription.id}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              prescription.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : prescription.status === "PENDING"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {prescription.status || "Unknown"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          {prescription.prescriber_name && (
                            <>
                              <span>Prescribed by: {prescription.prescriber_name}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{formatDateTime(prescription.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {prescription.items && prescription.items.length > 0 && (
                      <>
                      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                            <tr>
                              <th className="px-3 py-2">Medication</th>
                              <th className="px-3 py-2">Dose</th>
                              <th className="px-3 py-2">Frequency</th>
                              <th className="px-3 py-2">Duration</th>
                              <th className="px-3 py-2">Instructions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {prescription.items.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-slate-900">
                                  {item.drug_name || item.drug?.name || "—"}
                                </td>
                                <td className="px-3 py-2 text-slate-700">{item.dose || "—"}</td>
                                <td className="px-3 py-2 text-slate-700">
                                  {item.frequency || "—"}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {item.duration_days ? `${item.duration_days} days` : "—"}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {item.instruction || item.instructions || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="space-y-2 lg:hidden">
                        {prescription.items.map((item, idx) => (
                          <div key={item.id || idx} className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {item.drug_name || item.drug?.name || "—"}
                            </p>
                            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                              <p><span className="font-medium text-slate-700">Dose:</span> {item.dose || "—"}</p>
                              <p><span className="font-medium text-slate-700">Frequency:</span> {item.frequency || "—"}</p>
                              <p><span className="font-medium text-slate-700">Duration:</span> {item.duration_days ? `${item.duration_days} days` : "—"}</p>
                              <p><span className="font-medium text-slate-700">Instructions:</span> {item.instruction || item.instructions || "—"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      </>
                    )}

                    {prescription.note && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-medium text-slate-500">Notes</p>
                        <p className="mt-1 text-sm text-slate-700">{prescription.note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">Attachments</h2>
            </div>

            {attachmentsLoading && <p className="text-sm text-slate-500">Loading attachments…</p>}

            {attachmentsError && <p className="text-sm text-red-600">{attachmentsError}</p>}

            {!attachmentsLoading && !attachmentsError && attachments.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Paperclip className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm text-slate-600">No files attached to this encounter yet</p>
              </div>
            )}

            {!attachmentsLoading && attachments.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {attachments.map((att) => {
                  const fileUrl = att.file || att.url || att.download_url || "#";

                  const nameFromPath =
                    typeof att.file === "string" ? att.file.split("/").slice(-1)[0] : null;

                  const label = att.filename || att.name || nameFromPath || `Attachment #${att.id}`;

                  return (
                    <div
                      key={att.id || `${label}-${fileUrl}`}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 hover:bg-slate-100 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{label}</span>
                        </div>
                        {att.description && (
                          <span className="mt-1 text-xs text-slate-600">{att.description}</span>
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

          {/* Timeline - MOVED TO BOTTOM */}
          {(encounter?.paused_at ||
            encounter?.resumed_at ||
            encounter?.labs_skipped_at ||
            encounter?.clinical_finalized_at) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
                    detail={
                      encounter?.paused_by_name ? `By ${encounter.paused_by_name}` : undefined
                    }
                    color="text-amber-600"
                  />
                )}

                {encounter?.resumed_at && (
                  <TimelineEvent
                    icon={Play}
                    title="Resumed"
                    timestamp={encounter.resumed_at}
                    detail={
                      encounter?.resumed_by_name ? `By ${encounter.resumed_by_name}` : undefined
                    }
                    color="text-blue-600"
                  />
                )}

                {encounter?.labs_skipped_at && (
                  <TimelineEvent
                    icon={Beaker}
                    title="Labs Skipped"
                    timestamp={encounter.labs_skipped_at}
                    detail={
                      encounter?.labs_skipped_by_name
                        ? `By ${encounter.labs_skipped_by_name}`
                        : undefined
                    }
                    color="text-orange-600"
                  />
                )}

                {encounter?.clinical_finalized_at && (
                  <TimelineEvent
                    icon={CheckCircle2}
                    title="Clinical Documentation Finalized"
                    timestamp={encounter.clinical_finalized_at}
                    detail={
                      encounter?.clinical_finalized_by_name
                        ? `By ${encounter.clinical_finalized_by_name}`
                        : "Lock countdown started"
                    }
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
        </>
      )}
    </main>
  );
}
