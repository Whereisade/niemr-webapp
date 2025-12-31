// app/provider/encounters/[id]/page.js - ENHANCED VERSION
// ✨ Full parity with facility encounter detail page
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { pauseEncounter, resumeEncounter } from "@/lib/encounterActions";
import { downloadEncounterPdf } from "@/lib/reports";
import EncounterRelatedData from "@/components/encounters/EncounterRelatedData";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Building2,
  UserRound,
  Info,
  Activity,
  HeartPulse,
  Thermometer,
  Droplets,
  Stethoscope,
  FileDown,
  Edit3,
  CheckCircle2,
  Pill,
  Beaker,
  Lock,
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

// ✨ Enhanced status pill with better styling
function StatusPill({ status }) {
  const statusUpper = String(status || "").toUpperCase();
  
  const statusConfig = {
    OPEN: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", label: "Open" },
    IN_PROGRESS: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", label: "In Progress" },
    WAITING_LABS: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", label: "Waiting Labs" },
    CLOSED: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200", label: "Closed" },
    CROSSED_OUT: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", label: "Crossed Out" },
  };

  const config = statusConfig[statusUpper] || { 
    bg: "bg-slate-50", 
    text: "text-slate-600", 
    ring: "ring-slate-200", 
    label: status || "Unknown" 
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.bg} ${config.text} ${config.ring}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

// ✨ Collapsible section component for better organization
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, badge, variant = "default" }) {
  const [open, setOpen] = useState(defaultOpen);

  const variantStyles = {
    default: "border-slate-200 bg-white",
    info: "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50",
    warning: "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50",
  };

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${variantStyles[variant]}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-slate-500" />}
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {badge && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && <div className="border-t border-slate-100 px-4 py-3">{children}</div>}
    </div>
  );
}

// ✨ Enhanced vitals display component
function VitalsDisplay({ patientId }) {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadVitals() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch(`/vitals/?patient=${patientId}&limit=5`);
        if (cancelled) return;
        setVitals(normalizeList(data));
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load vitals.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVitals();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading vitals…
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-rose-600">{error}</div>;
  }

  if (vitals.length === 0) {
    return (
      <div className="text-xs text-slate-500">No vitals recorded yet.</div>
    );
  }

  const latest = vitals[0];

  return (
    <div className="space-y-3">
      {/* Latest vitals */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latest Vitals
          </p>
          <p className="text-[10px] text-slate-400">
            {formatDateTime(latest.measured_at)}
          </p>
        </div>

        <div className="grid gap-2">
          {/* Blood Pressure */}
          {latest.systolic && latest.diastolic && (
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-600">BP</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {latest.systolic}/{latest.diastolic}
                <span className="ml-1 text-xs font-normal text-slate-500">mmHg</span>
              </span>
            </div>
          )}

          {/* Heart Rate */}
          {latest.heart_rate && (
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-xs font-medium text-slate-600">Heart Rate</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {latest.heart_rate}
                <span className="ml-1 text-xs font-normal text-slate-500">bpm</span>
              </span>
            </div>
          )}

          {/* Temperature */}
          {latest.temp_c && (
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-medium text-slate-600">Temperature</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {latest.temp_c}
                <span className="ml-1 text-xs font-normal text-slate-500">°C</span>
              </span>
            </div>
          )}

          {/* SpO2 */}
          {latest.spo2 && (
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Droplets className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-medium text-slate-600">SpO₂</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {latest.spo2}
                <span className="ml-1 text-xs font-normal text-slate-500">%</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* View all vitals link */}
      {vitals.length > 1 && (
        <Link
          href={`/provider/patients/${patientId}?tab=vitals`}
          className="block text-center text-xs text-blue-600 hover:underline"
        >
          View all vitals ({vitals.length} records)
        </Link>
      )}
    </div>
  );
}

// ✨ Enhanced patient allergies component
function PatientAllergies({ patientId }) {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadAllergies() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch(`/patients/allergies/?patient=${patientId}`);
        if (cancelled) return;
        setAllergies(normalizeList(data));
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load allergies.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAllergies();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading allergies…
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-rose-600">{error}</div>;
  }

  if (allergies.length === 0) {
    return (
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        No known allergies recorded.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allergies.map((allergy) => (
        <div
          key={allergy.id}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-rose-900">
                {allergy.allergen || "Unknown allergen"}
              </div>
              {allergy.reaction && (
                <div className="mt-0.5 text-[11px] text-rose-700">
                  Reaction: {allergy.reaction}
                </div>
              )}
              {allergy.severity && (
                <div className="mt-0.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    allergy.severity === "SEVERE" 
                      ? "bg-red-600 text-white" 
                      : allergy.severity === "MODERATE"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {allergy.severity}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ✨ Enhanced patient profile card
function PatientProfileCard({ patient, loading, error }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading patient info…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
        {error}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-sm text-slate-500">No patient information available.</div>
    );
  }

  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(" ") || "Unknown";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-3">
      {/* Patient header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {initials || <User className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{fullName}</h3>
          <p className="text-xs text-slate-500">Patient ID: {patient.id}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-2 text-xs">
        {patient.dob && (
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>DOB: {formatDate(patient.dob || patient.date_of_birth)}</span>
          </div>
        )}
        {patient.gender && (
          <div className="flex items-center gap-2 text-slate-600">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>Gender: {patient.gender === "M" ? "Male" : patient.gender === "F" ? "Female" : patient.gender}</span>
          </div>
        )}
        {patient.phone && (
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>{patient.phone}</span>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{patient.email}</span>
          </div>
        )}
      </div>

      {/* Link to full patient record */}
      <Link
        href={`/provider/patients/${patient.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        View full patient record
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ✨ Patient documents list
function PatientDocumentsList({ patientId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadDocs() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch(`/patients/documents/?patient=${patientId}`);
        if (cancelled) return;
        setDocuments(normalizeList(data));
      } catch (err) {
        if (!cancelled) {
          setError("Unable to load documents.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDocs();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading documents…
      </div>
    );
  }

  if (error) {
    return <div className="text-xs text-rose-600">{error}</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="text-xs text-slate-500">No documents uploaded yet.</div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.slice(0, 5).map((doc) => (
        <a
          key={doc.id}
          href={doc.file}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs hover:bg-slate-100"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <div className="flex flex-col">
              <span className="font-medium text-slate-700 truncate max-w-[140px]">
                {doc.title || doc.document_type?.replace(/_/g, " ") || "Document"}
              </span>
              <span className="text-[10px] text-slate-400">
                {formatDate(doc.created_at)}
              </span>
            </div>
          </div>
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </a>
      ))}
      {documents.length > 5 && (
        <Link
          href={`/provider/patients/${patientId}`}
          className="block text-center text-xs text-blue-600 hover:underline"
        >
          +{documents.length - 5} more documents
        </Link>
      )}
    </div>
  );
}

// ✨ Clinical note section display
function NoteSection({ label, value, icon: Icon }) {
  const hasValue = Boolean(value && String(value).trim().length);

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-500" />}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
        {hasValue ? value : "—"}
      </div>
    </div>
  );
}

// ✨ Main component
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

  // PDF download state
  const [downloading, setDownloading] = useState(false);

  // Patient data
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState("");

  // Allergies count for badge
  const [allergiesCount, setAllergiesCount] = useState(0);

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

  async function handleDownloadPdf() {
    if (!id) return;
    try {
      setDownloading(true);
      await downloadEncounterPdf(id);
    } catch (err) {
      console.error("Download encounter PDF failed", err);
      alert(
        err?.message ||
          "Failed to download encounter report. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  }

  function openWorkflow() {
    if (!id) return;
    const statusUpper = String(encounter?.status || "").toUpperCase();
    const base = `/provider/encounters/${id}/workflow`;
    const target =
      statusUpper === "WAITING_LABS" ? `${base}/waiting-labs` : `${base}/clinical`;
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

        // Load patient data if we have a patient ID
        if (data?.patient) {
          loadPatient(data.patient);
        }
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

  async function loadPatient(patientId) {
    if (!patientId) return;
    setPatientLoading(true);
    setPatientError("");
    try {
      const data = await apiFetch(`/patients/${patientId}/`, { method: "GET" });
      setPatient(data);

      // Also load allergies count
      try {
        const allergies = await apiFetch(`/patients/allergies/?patient=${patientId}`);
        const items = normalizeList(allergies);
        setAllergiesCount(items.length);
      } catch {
        // Ignore allergies error
      }
    } catch (err) {
      setPatientError(err?.message || "Failed to load patient.");
      setPatient(null);
    } finally {
      setPatientLoading(false);
    }
  }

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
      <main className="mx-auto max-w-6xl p-6 md:p-10">
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

  const nurseName =
    encounter?.nurse_name ||
    (encounter?.nurse_first_name || encounter?.nurse_last_name
      ? `${encounter?.nurse_first_name || ""} ${
          encounter?.nurse_last_name || ""
        }`.trim()
      : "") ||
    null;

  const createdByName =
    encounter?.created_by_name ||
    (encounter?.created_by_first_name || encounter?.created_by_last_name
      ? `${encounter?.created_by_first_name || ""} ${
          encounter?.created_by_last_name || ""
        }`.trim()
      : "") ||
    encounter?.created_by ||
    null;

  const locked = Boolean(encounter?.locked || encounter?.locked_at);
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
    statusUpper === "WAITING_LABS" ? "Go to Waiting Labs" : "Open Workflow";

  const isIndependentEncounter = !encounter?.facility_id;
  const patientId = encounter?.patient;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      {/* Header / breadcrumbs */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </button>
          
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              Encounter for {patientName}
            </h1>
            {isIndependentEncounter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                <UserRound className="h-3 w-3" />
                Independent
              </span>
            )}
          </div>
          
          <p className="text-sm text-slate-600">
            Review clinical documentation, orders, and attachments for this encounter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Download PDF
              </>
            )}
          </button>

          {canOpenWorkflow && (
            <button
              type="button"
              onClick={openWorkflow}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              title="Open encounter workflow"
            >
              <Edit3 className="h-4 w-4" />
              {workflowBtnLabel}
            </button>
          )}

          {canPauseResume &&
            (statusUpper === "WAITING_LABS" ? (
              <button
                type="button"
                onClick={handleResume}
                disabled={statusUpdating}
                className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
                title="Resume encounter"
              >
                {statusUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                disabled={statusUpdating}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                title="Pause encounter (e.g., waiting on labs)"
              >
                {statusUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                Pause
              </button>
            ))}

          <StatusPill status={encounter?.status} />
        </div>
      </div>

      {/* Independent encounter context banner */}
      {isIndependentEncounter && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Info className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Independent Encounter</h3>
              <p className="mt-1 text-sm text-blue-800">
                This encounter was conducted independently without facility association. 
                All lab orders and prescriptions can be outsourced to your network of specialists.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status update errors */}
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
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading encounter details…
          </div>
        </div>
      )}

      {!loading && !error && !encounter && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Encounter not found.
        </div>
      )}

      {!loading && encounter && (
        <>
          {/* Main grid: Left sidebar + Right content */}
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Left sidebar: Patient info */}
            <div className="space-y-4">
              {/* Patient Details */}
              <CollapsibleSection title="Patient Details" icon={User} defaultOpen={true}>
                <PatientProfileCard
                  patient={patient}
                  loading={patientLoading}
                  error={patientError}
                />
              </CollapsibleSection>

              {/* Vitals */}
              <CollapsibleSection title="Vitals" icon={Activity} defaultOpen={true}>
                {patientId ? (
                  <VitalsDisplay patientId={patientId} />
                ) : (
                  <div className="text-xs text-slate-500">No patient linked.</div>
                )}
              </CollapsibleSection>

              {/* Allergies */}
              <CollapsibleSection
                title="Allergies"
                icon={AlertCircle}
                defaultOpen={true}
                badge={allergiesCount > 0 ? allergiesCount : null}
                variant={allergiesCount > 0 ? "warning" : "default"}
              >
                {patientId ? (
                  <PatientAllergies patientId={patientId} />
                ) : (
                  <div className="text-xs text-slate-500">No patient linked.</div>
                )}
              </CollapsibleSection>

              {/* Documents */}
              <CollapsibleSection title="Documents" icon={FileText} defaultOpen={false}>
                {patientId ? (
                  <PatientDocumentsList patientId={patientId} />
                ) : (
                  <div className="text-xs text-slate-500">No patient linked.</div>
                )}
              </CollapsibleSection>
            </div>

            {/* Right content: Encounter details */}
            <div className="space-y-6">
              {/* Encounter metadata card */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Encounter Information
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Patient
                    </p>
                    <p className="text-sm font-medium text-slate-900">{patientName}</p>
                  </div>

                  {!isIndependentEncounter && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Facility
                      </p>
                      <p className="text-sm font-medium text-slate-900">{facilityName}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Provider
                    </p>
                    <p className="text-sm font-medium text-slate-900">{providerName}</p>
                  </div>

                  {nurseName && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nurse
                      </p>
                      <p className="text-sm font-medium text-slate-900">{nurseName}</p>
                    </div>
                  )}

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

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Encounter ID
                    </p>
                    <p className="text-sm font-medium text-slate-900">#{id}</p>
                  </div>
                </div>

                {/* Timing & creator */}
                <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Started at
                    </p>
                    <p className="text-xs text-slate-700">
                      {formatDateTime(
                        encounter.start_at || encounter.created_at || encounter.occurred_at
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ended at
                    </p>
                    <p className="text-xs text-slate-700">
                      {formatDateTime(encounter.end_at)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Recorded by
                    </p>
                    <p className="text-xs text-slate-700">
                      {createdByName || providerName || "—"}
                    </p>
                  </div>
                </div>

                {locked && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <Lock className="h-4 w-4 text-slate-600" />
                    <span className="text-xs font-medium text-slate-700">
                      Note locked
                      {lockedAt && ` on ${formatDateTime(lockedAt)}`}
                    </span>
                  </div>
                )}
              </section>

              {/* Clinical note (structured) */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Clinical Documentation
                  </h2>
                  {locked && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <NoteSection
                    label="Chief Complaint"
                    value={clinicalFields.chiefComplaint}
                    icon={AlertCircle}
                  />
                  <NoteSection
                    label="Diagnoses"
                    value={clinicalFields.diagnoses}
                    icon={Stethoscope}
                  />
                  <div className="md:col-span-2">
                    <NoteSection
                      label="History of Present Illness (HPI)"
                      value={clinicalFields.hpi}
                      icon={FileText}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <NoteSection
                      label="Review of Systems (ROS)"
                      value={clinicalFields.ros}
                      icon={FileText}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <NoteSection
                      label="Physical Examination"
                      value={clinicalFields.exam}
                      icon={Activity}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <NoteSection
                      label="Treatment Plan"
                      value={clinicalFields.plan}
                      icon={CheckCircle2}
                    />
                  </div>
                </div>

                {!clinicalFields.chiefComplaint &&
                  !clinicalFields.hpi &&
                  !clinicalFields.ros &&
                  !clinicalFields.exam &&
                  !clinicalFields.diagnoses &&
                  !clinicalFields.plan && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                      No clinical documentation recorded for this encounter yet.
                    </div>
                  )}
              </section>

              {/* Related orders & prescriptions */}
              <EncounterRelatedData encounter={encounter} context="provider" />

              {/* Attachments section */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  Attachments
                </h2>

                {attachmentsLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading attachments…
                  </div>
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
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-900">
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
                              className="ml-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                            >
                              Open
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Linked appointment (if any) */}
              {encounter.appointment_id && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900 mb-2">
                    Linked Appointment
                  </h2>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">
                      Appointment #{encounter.appointment_id}
                    </span>
                  </div>
                </section>
              )}

              {/* Quick actions footer */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3">
                <Link
                  href="/provider/encounters"
                  className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to encounters list
                </Link>

                <div className="flex items-center gap-2">
                  {canOpenWorkflow && (
                    <>
                      <Link
                        href={`/provider/encounters/${id}/workflow/labs`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Beaker className="h-3.5 w-3.5" />
                        Labs
                      </Link>
                      
                      <Link
                        href={`/provider/encounters/${id}/workflow/prescription`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pill className="h-3.5 w-3.5" />
                        Prescription
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}