// app/provider/encounters/[id]/workflow/clinical/page.js - COMPLETE UPDATED VERSION
// ✨ Full parity with facility clinical page: Vitals, Attachments, Prescription button
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  addEncounterAmendment,
  finalizeEncounterNote,
  listEncounterAmendments,
  resumeEncounter,
} from "@/lib/encounterActions";
import { uploadAttachments } from "@/lib/attachments";
import VersionedSoapSection from "@/components/encounters/VersionedSoapSection";
import PatientAllergies from "@/components/patient/Patientallergies";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Save,
  Lock,
  ChevronRight,
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
  Pill,
  Paperclip,
} from "lucide-react";

function fmtDateTime(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString();
  } catch {
    return String(v);
  }
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

// ✨ NEW: Vitals display component
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
            {fmtDateTime(latest.measured_at)}
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

// ✨ NEW: SOAP Attachments component
function SoapAttachments({ encounterId, section, label }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadAttachments() {
    if (!encounterId) return;
    setLoading(true);
    setError("");
    
    try {
      const qs = new URLSearchParams();
      qs.set("owner_type", "encounter");
      qs.set("owner_id", String(encounterId));
      qs.set("tag", section); // Filter by SOAP section tag
      
      const data = await apiFetch(`/attachments/?${qs.toString()}`);
      setAttachments(normalizeList(data));
    } catch (err) {
      setError("Failed to load attachments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId, section]);

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setError("");

    try {
      await uploadAttachments({
        refType: "ENCOUNTER",
        refId: encounterId,
        files,
        tag: section, // Tag with SOAP section
      });
      await loadAttachments();
    } catch (err) {
      setError(err?.message || "Failed to upload attachments.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Paperclip className="h-3.5 w-3.5" />
          Attachments for {label}
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60">
            {uploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Paperclip className="h-3 w-3" />
                Upload
              </>
            )}
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-2 text-xs text-rose-600">{error}</div>
      )}

      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading attachments...
        </div>
      ) : attachments.length > 0 ? (
        <div className="mt-2 space-y-2">
          {attachments.map((att) => {
            const fileUrl = att.file || att.url || att.download_url || "#";
            const nameFromPath =
              typeof att.file === "string"
                ? att.file.split("/").slice(-1)[0]
                : null;
            const label =
              att.filename || att.name || nameFromPath || `File #${att.id}`;

            return (
              <div
                key={att.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-900 truncate max-w-[200px]">
                    {label}
                  </span>
                  {att.description && (
                    <span className="text-[10px] text-slate-500">
                      {att.description}
                    </span>
                  )}
                </div>
                {fileUrl && fileUrl !== "#" && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Open
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 text-xs text-slate-500">
          No attachments for this section yet.
        </div>
      )}
    </div>
  );
}

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
            <span>DOB: {fmtDate(patient.dob || patient.date_of_birth)}</span>
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
                {fmtDate(doc.created_at)}
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

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
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

export default function ProviderEncounterClinicalPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params?.id;

  const [me, setMe] = useState(null);
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Patient data
  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState("");

  // Allergies count for badge
  const [allergiesCount, setAllergiesCount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");

  // Amendments (versioned corrections) for locked notes
  const [amendments, setAmendments] = useState([]);
  const [amendmentsLoading, setAmendmentsLoading] = useState(false);
  const [amendmentsError, setAmendmentsError] = useState("");

  // Form
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [ros, setRos] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [diagnoses, setDiagnoses] = useState("");
  const [plan, setPlan] = useState("");

  // Ward admission request state
  const [requestingAdmission, setRequestingAdmission] = useState(false);
  const [admissionError, setAdmissionError] = useState("");
  const [admissionSuccess, setAdmissionSuccess] = useState("");

  async function loadMe() {
    try {
      const data = await apiFetch("/accounts/me/", { method: "GET" });
      setMe(data || null);
    } catch {
      setMe(null);
    }
  }

  async function loadEncounter() {
    if (!encounterId) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/encounters/${encounterId}/`, {
        method: "GET",
      });
      setEncounter(data);

      setChiefComplaint(data?.chief_complaint || "");
      setHpi(data?.hpi || "");
      setRos(data?.ros || "");
      setPhysicalExam(data?.physical_exam || "");
      setDiagnoses(data?.diagnoses || "");
      setPlan(data?.plan || "");

      // Load patient data if we have a patient ID
      if (data?.patient) {
        loadPatient(data.patient);
      }
    } catch (err) {
      setError(err?.message || "Failed to load encounter.");
      setEncounter(null);
    } finally {
      setLoading(false);
    }
  }

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

  useEffect(() => {
    loadMe();
    loadEncounter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  const role = String(me?.role || "").toUpperCase();
  const canEdit = useMemo(() => {
    return ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role);
  }, [role]);

  // Determine encounter context
  const isIndependentEncounter = !encounter?.facility_id;
  const isIndependentProvider = me && !me.facility_id;

  const isWaitingLabs =
    String(encounter?.status || "").toUpperCase() === "WAITING_LABS";
  const isCrossedOut =
    String(encounter?.status || "").toUpperCase() === "CROSSED_OUT";
  const isLocked = Boolean(encounter?.locked || encounter?.locked_at);

  const readOnly = !canEdit || isWaitingLabs || isCrossedOut || isLocked;

  const amendmentsBySection = useMemo(() => {
    const map = {};
    for (const a of amendments || []) {
      const k = a?.section;
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(a);
    }

    // Oldest → newest so the UI can strike-through older versions
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        return ta - tb;
      });
    });

    return map;
  }, [amendments]);

  useEffect(() => {
    let cancelled = false;

    async function loadAmendments() {
      if (!encounterId || !isLocked) {
        setAmendments([]);
        return;
      }

      setAmendmentsLoading(true);
      setAmendmentsError("");
      try {
        const data = await listEncounterAmendments(encounterId);
        if (cancelled) return;
        setAmendments(normalizeList(data));
      } catch (err) {
        if (cancelled) return;
        setAmendmentsError(
          err?.message || "Failed to load section corrections."
        );
        setAmendments([]);
      } finally {
        if (!cancelled) setAmendmentsLoading(false);
      }
    }

    loadAmendments();
    return () => {
      cancelled = true;
    };
  }, [encounterId, isLocked]);

  async function handleSave() {
    if (!encounterId) return;
    setSaveError("");
    setSaving(true);
    try {
      const payload = {
        chief_complaint: chiefComplaint,
        hpi,
        ros,
        physical_exam: physicalExam,
        diagnoses,
        plan,
      };

      const updated = await apiFetch(`/encounters/${encounterId}/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setEncounter(updated);
    } catch (err) {
      setSaveError(err?.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    if (!encounterId) return;
    setFinalizeError("");
    setFinalizing(true);
    try {
      await finalizeEncounterNote(encounterId);
      router.push(`/provider/encounters/${encounterId}/workflow/prescription`);
    } catch (err) {
      setFinalizeError(err?.message || "Failed to finalize note.");
    } finally {
      setFinalizing(false);
    }
  }

  async function handleSkipLabs() {
    if (!encounterId) return;
    setFinalizeError("");
    setFinalizing(true);
    try {
      await apiFetch(`/encounters/${encounterId}/skip_labs/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadEncounter();
    } catch (err) {
      setFinalizeError(err?.message || "Failed to skip labs.");
    } finally {
      setFinalizing(false);
    }
  }

  async function handleResume() {
    if (!encounterId) return;
    setFinalizeError("");
    setFinalizing(true);
    try {
      await resumeEncounter(encounterId);
      await loadEncounter();
    } catch (err) {
      setFinalizeError(err?.message || "Failed to resume encounter.");
    } finally {
      setFinalizing(false);
    }
  }

  // ✨ NEW: Navigate to prescription page
  function goToPrescription() {
    router.push(`/provider/encounters/${encounterId}/workflow/prescription`);
  }

  // Ward admission request handler
  async function handleRequestAdmission() {
    if (!encounterId) return;
    setAdmissionError("");
    setAdmissionSuccess("");
    setRequestingAdmission(true);
    
    try {
      const response = await apiFetch(`/encounters/${encounterId}/request_admission/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      
      setAdmissionSuccess(response?.detail || "Ward admission request sent successfully.");
      setTimeout(() => setAdmissionSuccess(""), 5000);
    } catch (err) {
      setAdmissionError(err?.message || "Failed to request ward admission.");
    } finally {
      setRequestingAdmission(false);
    }
  }

  async function handleCreateCorrection({ section, reason, content, files, amendment_type }) {
    if (!encounterId) throw new Error("encounterId is required");

    // Backend enforces lock before accepting corrections.
    const created = await addEncounterAmendment(encounterId, {
      section,
      reason,
      content,
      amendment_type
    });

    const createdId = created?.id;
    if (createdId && files?.length) {
      await uploadAttachments({
        refType: "ENCOUNTER_AMENDMENT",
        refId: createdId,
        files,
        patient: encounter?.patient,
        tag: "SOAP_CORRECTION",
      });
    }

    // Refresh corrections and the encounter
    try {
      const data = await listEncounterAmendments(encounterId);
      setAmendments(normalizeList(data));
    } catch {
      // ignore
    }
    try {
      const refreshed = await apiFetch(`/encounters/${encounterId}/`, {
        method: "GET",
      });
      setEncounter(refreshed);
    } catch {
      // ignore
    }

    return created;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (error && !encounter) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="font-semibold">Could not open SOAP note</div>
          <div className="mt-1 text-sm">{error}</div>
          <div className="mt-3">
            <Link
              href={`/provider/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Encounter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lockDueAt = encounter?.lock_due_at || null;
  const patientId = encounter?.patient;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link
              href={`/provider/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Encounter
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-800">SOAP Note</span>
          </div>

          {/* Context badge */}
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">
              Diagnosis & SOAP Note
            </h1>
            {isIndependentEncounter ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                <UserRound className="h-3 w-3" />
                Independent
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                <Building2 className="h-3 w-3" />
                Facility
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Encounter #{encounterId}</span>
            <span>•</span>
            <span>Status: {encounter?.status || "—"}</span>
            {isLocked ? (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-800">
                  <Lock className="h-3.5 w-3.5" /> Locked
                </span>
              </>
            ) : null}
          </div>

          {lockDueAt ? (
            <div className="mt-1 text-sm text-slate-600">
              Lock due: <span className="font-medium">{fmtDateTime(lockDueAt)}</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/provider/encounters/${encounterId}/workflow/labs`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            title="Order/request labs for this encounter"
          >
            <ExternalLink className="h-4 w-4" />
            Labs
          </Link>

          {/* ✨ NEW: Prescription button at top */}
          <button
            onClick={goToPrescription}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            title="Go to prescription workflow"
          >
            <Pill className="h-4 w-4" />
            Prescription
          </button>

          {/* Ward admission only for facility encounters */}
          {!isIndependentEncounter && canEdit && (
            <button
              onClick={handleRequestAdmission}
              disabled={requestingAdmission}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              title="Request ward admission for this patient"
            >
              {requestingAdmission ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              Ward Admission
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || readOnly}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            title="Save SOAP note"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>

          <button
            onClick={handleFinalize}
            disabled={finalizing || readOnly}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            title="Finalize SOAP note and continue to prescriptions"
          >
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Finalize → Prescription
          </button>
        </div>
      </div>

      
      

      {/* Ward admission messages */}
      {admissionSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {admissionSuccess}
        </div>
      )}

      {admissionError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {admissionError}
        </div>
      )}

      {/* Error messages */}
      {saveError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {saveError}
        </div>
      ) : null}

      {finalizeError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {finalizeError}
        </div>
      ) : null}

      {/* Status banners */}
      {isWaitingLabs ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <div className="text-sm font-semibold text-amber-900">
                Waiting for labs — Encounter is read-only
              </div>
              <div className="mt-1 text-sm text-amber-900/80">
                Resume or skip labs to continue editing this note.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleResume}
                  disabled={finalizing}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Resume
                </button>
                <button
                  onClick={handleSkipLabs}
                  disabled={finalizing}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                >
                  Skip Labs
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!canEdit ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Only doctors (or admins) can edit the clinical note.
        </div>
      ) : null}

      {isLocked ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
          This note is locked. You can only correct individual sections by adding
          a new version (the previous version will be struck through).
        </div>
      ) : null}

      {/* Main content: Patient Profile + SOAP Notes */}
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {/* Left sidebar: Patient Profile */}
        <div className="space-y-4">
          {/* Patient Details */}
          <CollapsibleSection title="Patient Details" icon={User} defaultOpen={true}>
            <PatientProfileCard
              patient={patient}
              loading={patientLoading}
              error={patientError}
            />
          </CollapsibleSection>

          {/* ✨ NEW: Vitals Section */}
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

        {/* Right: SOAP Notes */}
        <div>
          {isLocked ? (
            <div className="space-y-4">
              {amendmentsError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {amendmentsError}
                </div>
              ) : null}

              {amendmentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading section corrections…
                </div>
              ) : null}

              <VersionedSoapSection
                label="Chief Complaint"
                section="CHIEF_COMPLAINT"
                original={chiefComplaint}
                amendments={amendmentsBySection.CHIEF_COMPLAINT || []}
                onCreate={handleCreateCorrection}
                disabled={!canEdit || finalizing}
              />

              <VersionedSoapSection
                label="HPI"
                section="HPI"
                original={hpi}
                amendments={amendmentsBySection.HPI || []}
                onCreate={handleCreateCorrection}
                disabled={!canEdit || finalizing}
              />

              <VersionedSoapSection
                label="ROS"
                section="ROS"
                original={ros}
                amendments={amendmentsBySection.ROS || []}
                onCreate={handleCreateCorrection}
                disabled={!canEdit || finalizing}
              />

              <VersionedSoapSection
                label="Physical Exam"
                section="PHYSICAL_EXAM"
                original={physicalExam}
                amendments={amendmentsBySection.PHYSICAL_EXAM || []}
                onCreate={handleCreateCorrection}
                disabled={!canEdit || finalizing}
              />

              <VersionedSoapSection
                label="Diagnoses"
                section="DIAGNOSES"
                original={diagnoses}
                amendments={amendmentsBySection.DIAGNOSES || []}
                onCreate={handleCreateCorrection}
                disabled={!canEdit || finalizing}
              />

              <VersionedSoapSection
                label="Plan"
                section="PLAN"
                original={plan}
                amendments={amendmentsBySection.PLAN || []}
                onCreate={handleCreateCorrection}
                disabled={!canEdit || finalizing}
              />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Chief Complaint
                  </span>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    rows={3}
                    disabled={readOnly}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  />
                </label>

                {/* ✨ NEW: Attachments for Chief Complaint */}
                {encounterId && (
                  <SoapAttachments
                    encounterId={encounterId}
                    section="CHIEF_COMPLAINT"
                    label="Chief Complaint"
                  />
                )}

                <label className="mt-3 grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    HPI
                  </span>
                  <textarea
                    value={hpi}
                    onChange={(e) => setHpi(e.target.value)}
                    rows={6}
                    disabled={readOnly}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  />
                </label>

                {/* ✨ NEW: Attachments for HPI */}
                {encounterId && (
                  <SoapAttachments
                    encounterId={encounterId}
                    section="HPI"
                    label="HPI"
                  />
                )}

                <label className="mt-3 grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ROS
                  </span>
                  <textarea
                    value={ros}
                    onChange={(e) => setRos(e.target.value)}
                    rows={5}
                    disabled={readOnly}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  />
                </label>

                {/* ✨ NEW: Attachments for ROS */}
                {encounterId && (
                  <SoapAttachments
                    encounterId={encounterId}
                    section="ROS"
                    label="ROS"
                  />
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Physical Exam
                  </span>
                  <textarea
                    value={physicalExam}
                    onChange={(e) => setPhysicalExam(e.target.value)}
                    rows={6}
                    disabled={readOnly}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  />
                </label>

                {/* ✨ NEW: Attachments for Physical Exam */}
                {encounterId && (
                  <SoapAttachments
                    encounterId={encounterId}
                    section="PHYSICAL_EXAM"
                    label="Physical Exam"
                  />
                )}

                <label className="mt-3 grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Diagnoses
                  </span>
                  <textarea
                    value={diagnoses}
                    onChange={(e) => setDiagnoses(e.target.value)}
                    rows={4}
                    disabled={readOnly}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  />
                </label>

                {/* ✨ NEW: Attachments for Diagnoses */}
                {encounterId && (
                  <SoapAttachments
                    encounterId={encounterId}
                    section="DIAGNOSES"
                    label="Diagnoses"
                  />
                )}

                <label className="mt-3 grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Plan
                  </span>
                  <textarea
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    rows={5}
                    disabled={readOnly}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
                  />
                </label>

                {/* ✨ NEW: Attachments for Plan */}
                {encounterId && (
                  <SoapAttachments
                    encounterId={encounterId}
                    section="PLAN"
                    label="Plan"
                  />
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || readOnly}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </button>

                  <button
                    onClick={handleFinalize}
                    disabled={finalizing || readOnly}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Finalize → Prescription
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}