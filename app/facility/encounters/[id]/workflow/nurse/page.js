"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Activity,
  Thermometer,
  HeartPulse,
  Droplets,
  Gauge,
  Bell,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  UserRound,
  X,
  Plus,
  FlaskConical,
  Pill,
  ShieldAlert,
  UserCog,
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

function normalizeList(body) {
  if (!body) return [];
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body)) return body;
  return [];
}

function VitalMetric({ icon: Icon, label, value, unit, color = "text-slate-600" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className={`rounded-md bg-white p-1.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">
        {value || "—"}
        {value && unit && (
          <span className="ml-1 text-xs font-normal text-slate-500">{unit}</span>
        )}
      </span>
    </div>
  );
}

function OverallBadge({ value }) {
  const v = String(value || "").toUpperCase();
  const config = {
    GREEN: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", label: "Normal" },
    YELLOW: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", label: "Warning" },
    RED: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", label: "Critical" },
  };
  const style = config[v] || { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200", label: value || "—" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ring-1 ${style.bg} ${style.text} ${style.ring}`}>
      {v === "RED" && <AlertCircle className="h-3 w-3" />}
      {style.label}
    </span>
  );
}

function StatusPill({ status }) {
  const statusUpper = String(status || "").toUpperCase();
  
  const statusConfig = {
    OPEN: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Open" },
    IN_PROGRESS: { bg: "bg-blue-50", text: "text-blue-700", label: "In Progress" },
    WAITING_LABS: { bg: "bg-amber-50", text: "text-amber-700", label: "Waiting Labs" },
    CLOSED: { bg: "bg-slate-100", text: "text-slate-700", label: "Closed" },
    CROSSED_OUT: { bg: "bg-red-50", text: "text-red-700", label: "Crossed Out" },
  };

  const config = statusConfig[statusUpper] || { bg: "bg-slate-50", text: "text-slate-600", label: status || "Unknown" };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

export default function FacilityEncounterNursePage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params?.id;

  const [me, setMe] = useState(null);
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Vitals state
  const [vitals, setVitals] = useState([]);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState("");

  // New vitals form
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    systolic: "",
    diastolic: "",
    heart_rate: "",
    temp_c: "",
    resp_rate: "",
    spo2: "",
    weight_kg: "",
    height_cm: "",
  });
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false);
  const [vitalsSuccess, setVitalsSuccess] = useState("");

  // Reminder modal
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderTime, setReminderTime] = useState(DateTime.now().plus({ hours: 1 }).toISO().slice(0, 16));
  const [reminderSubmitting, setReminderSubmitting] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState("");
  const [reminderError, setReminderError] = useState("");

  // Doctor assignment
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [assigningDoctor, setAssigningDoctor] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState("");
  const [assignError, setAssignError] = useState("");

  // Lab order modal
  const [showLabModal, setShowLabModal] = useState(false);
  const [labCatalog, setLabCatalog] = useState([]);
  const [loadingLabCatalog, setLoadingLabCatalog] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  const [labPriority, setLabPriority] = useState("ROUTINE");
  const [labNotes, setLabNotes] = useState("");
  const [labSubmitting, setLabSubmitting] = useState(false);
  const [labSuccess, setLabSuccess] = useState("");
  const [labError, setLabError] = useState("");

  // Prescription modal
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [drugCatalog, setDrugCatalog] = useState([]);
  const [loadingDrugCatalog, setLoadingDrugCatalog] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState([
    { drug: "", dose: "", frequency: "", duration_days: "", instructions: "" }
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [prescriptionSubmitting, setPrescriptionSubmitting] = useState(false);
  const [prescriptionSuccess, setPrescriptionSuccess] = useState("");
  const [prescriptionError, setPrescriptionError] = useState("");

  // Allergies modal
  const [showAllergiesModal, setShowAllergiesModal] = useState(false);
  const [allergies, setAllergies] = useState([]);
  const [loadingAllergies, setLoadingAllergies] = useState(false);
  const [allergyForm, setAllergyForm] = useState({
    allergen: "",
    allergy_type: "OTHER",
    severity: "MODERATE",
    reaction: "",
    onset_date: "",
    notes: "",
  });
  const [allergySubmitting, setAllergySubmitting] = useState(false);
  const [allergySuccess, setAllergySuccess] = useState("");
  const [allergyError, setAllergyError] = useState("");

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
      const data = await apiFetch(`/encounters/${encounterId}/`, { method: "GET" });
      setEncounter(data);
    } catch (err) {
      setError(err?.message || "Failed to load encounter.");
      setEncounter(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadVitals() {
    if (!encounter?.patient) return;
    setVitalsLoading(true);
    setVitalsError("");
    try {
      const data = await apiFetch(`/vitals/?patient=${encounter.patient}&limit=10`);
      setVitals(normalizeList(data));
    } catch (err) {
      setVitalsError(err?.message || "Failed to load vitals.");
      setVitals([]);
    } finally {
      setVitalsLoading(false);
    }
  }

  async function loadDoctors() {
    setLoadingDoctors(true);
    try {
      const data = await apiFetch(
        "/providers/?facility=current&type=DOCTOR&limit=100"
      );
      const allProviders = normalizeList(data);

      // ✅ Filter to only include users with actual DOCTOR/ADMIN/SUPER_ADMIN role
      // This prevents users with provider_type=DOCTOR but user.role=PHARMACY from appearing
      const allowedRoles = ["DOCTOR", "ADMIN", "SUPER_ADMIN"];
      const actualDoctors = allProviders.filter((p) => {
        const roleUpper = String(p.user_role || "").toUpperCase();
        return allowedRoles.includes(roleUpper);
      });

      setDoctors(actualDoctors);

      // Optional: Log for debugging (remove after confirming it works)
      if (actualDoctors.length !== allProviders.length) {
        console.log(
          `Filtered ${allProviders.length} providers to ${actualDoctors.length} actual doctors`
        );
        console.log(
          "Filtered out:",
          allProviders
            .filter((p) => !actualDoctors.includes(p))
            .map((p) => ({
              name: `${p.first_name} ${p.last_name}`,
              provider_type: p.provider_type,
              user_role: p.user_role,
            }))
        );
      }
    } catch (err) {
      console.error("Failed to load doctors:", err);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  }

  async function loadLabCatalog() {
    setLoadingLabCatalog(true);
    try {
      const data = await apiFetch("/labs/catalog/");
      setLabCatalog(normalizeList(data));
    } catch (err) {
      console.error("Failed to load lab catalog:", err);
    } finally {
      setLoadingLabCatalog(false);
    }
  }

  async function loadDrugCatalog() {
    setLoadingDrugCatalog(true);
    try {
      const data = await apiFetch("/pharmacy/catalog/");
      setDrugCatalog(normalizeList(data));
    } catch (err) {
      console.error("Failed to load drug catalog:", err);
    } finally {
      setLoadingDrugCatalog(false);
    }
  }

  async function loadAllergies() {
    if (!encounter?.patient) return;
    setLoadingAllergies(true);
    try {
      const data = await apiFetch(`/patients/allergies/?patient=${encounter.patient}`);
      setAllergies(normalizeList(data));
    } catch (err) {
      console.error("Failed to load allergies:", err);
      setAllergies([]);
    } finally {
      setLoadingAllergies(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadDoctors();
  }, []);

  useEffect(() => {
    if (me) {
      loadEncounter();
    }
  }, [encounterId, me]);

  useEffect(() => {
    if (encounter?.patient) {
      loadVitals();
      loadAllergies();
    }
  }, [encounter?.patient]);

  const role = String(me?.role || "").toUpperCase();
  const canProceed = useMemo(() => {
    return ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role);
  }, [role]);

  const isNurse = role === "NURSE";
  const patientId = encounter?.patient;

  const patientName =
    encounter?.patient_name ||
    (encounter?.patient_first_name || encounter?.patient_last_name
      ? `${encounter?.patient_first_name || ""} ${encounter?.patient_last_name || ""}`.trim()
      : "") ||
    `Patient #${patientId || "—"}`;

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSubmitVitals(e) {
    e.preventDefault();
    if (!patientId) return;

    setVitalsSubmitting(true);
    setVitalsError("");
    setVitalsSuccess("");

    try {
      const payload = {
        patient: patientId,
        measured_at: new Date().toISOString(),
        encounter: encounterId,
      };

      if (vitalsForm.systolic) payload.systolic = parseInt(vitalsForm.systolic);
      if (vitalsForm.diastolic) payload.diastolic = parseInt(vitalsForm.diastolic);
      if (vitalsForm.heart_rate) payload.heart_rate = parseInt(vitalsForm.heart_rate);
      if (vitalsForm.temp_c) payload.temp_c = parseFloat(vitalsForm.temp_c);
      if (vitalsForm.resp_rate) payload.resp_rate = parseInt(vitalsForm.resp_rate);
      if (vitalsForm.spo2) payload.spo2 = parseInt(vitalsForm.spo2);
      if (vitalsForm.weight_kg) payload.weight_kg = parseFloat(vitalsForm.weight_kg);
      if (vitalsForm.height_cm) payload.height_cm = parseFloat(vitalsForm.height_cm);

      await apiFetch("/vitals/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setVitalsSuccess("Vitals recorded successfully.");
      setVitalsForm({
        systolic: "",
        diastolic: "",
        heart_rate: "",
        temp_c: "",
        resp_rate: "",
        spo2: "",
        weight_kg: "",
        height_cm: "",
      });
      setShowVitalsForm(false);
      await loadVitals();
    } catch (err) {
      setVitalsError(err?.message || "Failed to record vitals.");
    } finally {
      setVitalsSubmitting(false);
    }
  }

  async function handleSubmitReminder(e) {
    e.preventDefault();
    if (!patientId || !reminderMessage.trim()) return;

    setReminderSubmitting(true);
    setReminderError("");
    setReminderSuccess("");

    try {
      await apiFetch("/notifications/reminders/", {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          encounter: encounterId,
          message: reminderMessage.trim(),
          reminder_time: new Date(reminderTime).toISOString(),
        }),
      });

      setReminderSuccess("Reminder set successfully.");
      setReminderMessage("");
      setReminderTime(DateTime.now().plus({ hours: 1 }).toISO().slice(0, 16));
      setTimeout(() => {
        setShowReminderModal(false);
        setReminderSuccess("");
      }, 1500);
    } catch (err) {
      setReminderError(err?.message || "Failed to set reminder.");
    } finally {
      setReminderSubmitting(false);
    }
  }

  async function handleAssignDoctor(e) {
    e.preventDefault();
    if (!selectedDoctor) return;

    setAssigningDoctor(true);
    setAssignError("");
    setAssignSuccess("");

    try {
      await apiFetch(`/encounters/${encounterId}/assign_provider/`, {
        method: "POST",
        body: JSON.stringify({ provider: parseInt(selectedDoctor) }),
      });

      setAssignSuccess("Doctor assigned successfully.");
      await loadEncounter();
      setTimeout(() => {
        setAssignSuccess("");
      }, 3000);
    } catch (err) {
      setAssignError(err?.message || "Failed to assign doctor.");
    } finally {
      setAssigningDoctor(false);
    }
  }

  async function handleSubmitLabOrder(e) {
    e.preventDefault();
    if (!patientId || selectedTests.length === 0) return;

    setLabSubmitting(true);
    setLabError("");
    setLabSuccess("");

    try {
      const payload = {
        patient: patientId,
        encounter: encounterId,
        priority: labPriority,
        note: labNotes,
        items: selectedTests.map(testId => ({
          test_code: labCatalog.find(t => t.id === testId)?.code
        })).filter(item => item.test_code),
      };

      if (encounter?.provider) {
        payload.provider = encounter.provider;
      }

      await apiFetch("/labs/orders/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setLabSuccess("Lab order created successfully.");
      setSelectedTests([]);
      setLabNotes("");
      setLabPriority("ROUTINE");
      
      setTimeout(() => {
        setShowLabModal(false);
        setLabSuccess("");
      }, 1500);
    } catch (err) {
      setLabError(err?.message || "Failed to create lab order.");
    } finally {
      setLabSubmitting(false);
    }
  }

  async function handleSubmitPrescription(e) {
    e.preventDefault();
    if (!patientId || prescriptionItems.every(item => !item.drug)) return;

    setPrescriptionSubmitting(true);
    setPrescriptionError("");
    setPrescriptionSuccess("");

    try {
      const validItems = prescriptionItems.filter(item => item.drug);
      
      const payload = {
        patient: patientId,
        encounter: encounterId,
        note: prescriptionNotes,
        items: validItems.map(item => ({
          drug: parseInt(item.drug),
          dose: item.dose,
          frequency: item.frequency,
          duration_days: item.duration_days ? parseInt(item.duration_days) : null,
          instructions: item.instructions,
        })),
      };

      if (encounter?.provider) {
        payload.prescriber = encounter.provider;
      }

      await apiFetch("/pharmacy/prescriptions/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setPrescriptionSuccess("Prescription created successfully.");
      setPrescriptionItems([
        { drug: "", dose: "", frequency: "", duration_days: "", instructions: "" }
      ]);
      setPrescriptionNotes("");
      
      setTimeout(() => {
        setShowPrescriptionModal(false);
        setPrescriptionSuccess("");
      }, 1500);
    } catch (err) {
      setPrescriptionError(err?.message || "Failed to create prescription.");
    } finally {
      setPrescriptionSubmitting(false);
    }
  }

  async function handleSubmitAllergy(e) {
    e.preventDefault();
    if (!patientId || !allergyForm.allergen.trim()) return;

    setAllergySubmitting(true);
    setAllergyError("");
    setAllergySuccess("");

    try {
      const payload = {
        patient: patientId,
        allergen: allergyForm.allergen.trim(),
        allergy_type: allergyForm.allergy_type,
        severity: allergyForm.severity,
        reaction: allergyForm.reaction,
        onset_date: allergyForm.onset_date || null,
        notes: allergyForm.notes,
      };

      await apiFetch("/patients/allergies/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAllergySuccess("Allergy recorded successfully.");
      setAllergyForm({
        allergen: "",
        allergy_type: "OTHER",
        severity: "MODERATE",
        reaction: "",
        onset_date: "",
        notes: "",
      });
      
      await loadAllergies();
      
      setTimeout(() => {
        setAllergySuccess("");
      }, 3000);
    } catch (err) {
      setAllergyError(err?.message || "Failed to record allergy.");
    } finally {
      setAllergySubmitting(false);
    }
  }

  function handleProceedToClinical() {
    router.push(`/facility/encounters/${encounterId}/workflow/clinical`);
  }

  function handleAddPrescriptionItem() {
    setPrescriptionItems([
      ...prescriptionItems,
      { drug: "", dose: "", frequency: "", duration_days: "", instructions: "" }
    ]);
  }

  function handleRemovePrescriptionItem(index) {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  }

  function handlePrescriptionItemChange(index, field, value) {
    const newItems = [...prescriptionItems];
    newItems[index][field] = value;
    setPrescriptionItems(newItems);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading encounter…
        </div>
      </div>
    );
  }

  if (error && !encounter) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="font-semibold">Could not open encounter</div>
          <div className="mt-1 text-sm">{error}</div>
          <div className="mt-3">
            <Link
              href="/facility/encounters"
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Encounters
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const latestVital = vitals[0] || null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link
              href={`/facility/encounters/${encounterId}`}
              className="inline-flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Encounter
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-800">Nurse Assessment</span>
          </div>

          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Nurse Assessment & Vitals
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Record patient vitals and manage encounter details before proceeding
            to clinical workflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={encounter?.status} />

          <button
            type="button"
            onClick={() => setShowReminderModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            Set Reminder
          </button>

          {canProceed ? (
            <button
              type="button"
              onClick={handleProceedToClinical}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Continue to Clinical
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <Clock className="h-4 w-4" />
              Awaiting Doctor
            </div>
          )}
        </div>
      </div>

      {/* Encounter Info Card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <UserRound className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Patient</p>
              <p className="text-sm font-semibold text-slate-900">
                {patientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Provider</p>
              <p className="text-sm font-semibold text-slate-900">
                {encounter?.provider_name || "Unassigned"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Started</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatDateTime(
                  encounter?.occurred_at || encounter?.created_at
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Activity className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Status</p>
              <StatusPill status={encounter?.status} />
            </div>
          </div>
        </div>

        {encounter?.reason && (
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Chief Complaint / Reason
            </p>
            <p className="mt-1 text-sm text-slate-800">{encounter.reason}</p>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            loadLabCatalog();
            setShowLabModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
        >
          <FlaskConical className="h-5 w-5" />
          Order Lab Tests
        </button>

        <button
          type="button"
          onClick={() => {
            loadDrugCatalog();
            setShowPrescriptionModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          <Pill className="h-5 w-5" />
          Create Prescription
        </button>

        <button
          type="button"
          onClick={() => setShowAllergiesModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        >
          <ShieldAlert className="h-5 w-5" />
          Manage Allergies
        </button>

        <button
          type="button"
          onClick={() => {}}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <UserCog className="h-5 w-5" />
          Assign Doctor
        </button>
      </div>

      {/* Doctor Assignment */}
      {!encounter?.provider && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <UserCog className="h-5 w-5 text-amber-700" />
            <h3 className="text-sm font-semibold text-amber-900">
              Assign Doctor
            </h3>
          </div>

          {assignSuccess && (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {assignSuccess}
            </div>
          )}

          {assignError && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {assignError}
            </div>
          )}

          <form onSubmit={handleAssignDoctor} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Select Doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                disabled={loadingDoctors || assigningDoctor}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              >
                <option value="">
                  {loadingDoctors ? "Loading doctors..." : "Select a doctor"}
                </option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.user}>
                    {doc.first_name} {doc.last_name} (
                    {doc.user_role || "Unknown"})
                    {doc.specialties_read &&
                      doc.specialties_read.length > 0 &&
                      ` - ${doc.specialties_read.join(", ")}`}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!selectedDoctor || assigningDoctor}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {assigningDoctor ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Assign
            </button>
          </form>
        </div>
      )}

      {/* Success/Error Messages */}
      {vitalsSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {vitalsSuccess}
          </div>
        </div>
      )}

      {vitalsError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {vitalsError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Vitals Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Latest Vitals
                </h2>
                {latestVital && (
                  <p className="text-xs text-slate-500">
                    {formatDateTime(latestVital.measured_at)}
                  </p>
                )}
              </div>
            </div>

            {latestVital && <OverallBadge value={latestVital.overall} />}
          </div>

          <div className="p-4">
            {vitalsLoading ? (
              <div className="flex items-center gap-2 py-8 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading vitals…
              </div>
            ) : latestVital ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <VitalMetric
                  icon={Activity}
                  label="Blood Pressure"
                  value={
                    latestVital.systolic && latestVital.diastolic
                      ? `${latestVital.systolic}/${latestVital.diastolic}`
                      : null
                  }
                  unit="mmHg"
                />
                <VitalMetric
                  icon={HeartPulse}
                  label="Heart Rate"
                  value={latestVital.heart_rate}
                  unit="bpm"
                  color="text-rose-600"
                />
                <VitalMetric
                  icon={Thermometer}
                  label="Temperature"
                  value={latestVital.temp_c}
                  unit="°C"
                  color="text-amber-600"
                />
                <VitalMetric
                  icon={Droplets}
                  label="SpO₂"
                  value={latestVital.spo2}
                  unit="%"
                  color="text-blue-600"
                />
                {latestVital.resp_rate && (
                  <VitalMetric
                    icon={Activity}
                    label="Resp. Rate"
                    value={latestVital.resp_rate}
                    unit="br/min"
                  />
                )}
                {latestVital.bmi && (
                  <VitalMetric
                    icon={Gauge}
                    label="BMI"
                    value={latestVital.bmi}
                    unit=""
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Activity className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  No vitals recorded
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Record vitals to begin the clinical assessment
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={() => setShowVitalsForm(!showVitalsForm)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              {showVitalsForm ? "Cancel" : "Record New Vitals"}
            </button>
          </div>
        </div>

        {/* Record Vitals Form */}
        {showVitalsForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <Thermometer className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                Record Vitals
              </h2>
            </div>

            <form onSubmit={handleSubmitVitals} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    name="systolic"
                    value={vitalsForm.systolic}
                    onChange={handleVitalsChange}
                    placeholder="120"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    name="diastolic"
                    value={vitalsForm.diastolic}
                    onChange={handleVitalsChange}
                    placeholder="80"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    name="heart_rate"
                    value={vitalsForm.heart_rate}
                    onChange={handleVitalsChange}
                    placeholder="72"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="temp_c"
                    value={vitalsForm.temp_c}
                    onChange={handleVitalsChange}
                    placeholder="36.5"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Respiratory Rate (br/min)
                  </label>
                  <input
                    type="number"
                    name="resp_rate"
                    value={vitalsForm.resp_rate}
                    onChange={handleVitalsChange}
                    placeholder="16"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    SpO₂ (%)
                  </label>
                  <input
                    type="number"
                    name="spo2"
                    value={vitalsForm.spo2}
                    onChange={handleVitalsChange}
                    placeholder="98"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="weight_kg"
                    value={vitalsForm.weight_kg}
                    onChange={handleVitalsChange}
                    placeholder="70"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="height_cm"
                    value={vitalsForm.height_cm}
                    onChange={handleVitalsChange}
                    placeholder="175"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  Only fields with values will be saved.
                </p>
                <button
                  type="submit"
                  disabled={vitalsSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {vitalsSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save Vitals
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vitals History */}
        {vitals.length > 1 && !showVitalsForm && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent Vitals History
              </h2>
              <p className="text-xs text-slate-500">
                Last {Math.min(vitals.length, 5)} recordings
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {vitals.slice(0, 5).map((v, idx) => (
                <div
                  key={v.id || idx}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-500">
                      {formatDateTime(v.measured_at)}
                    </div>
                    <div className="text-sm text-slate-800">
                      {v.systolic && v.diastolic && (
                        <span className="mr-3">
                          BP: {v.systolic}/{v.diastolic}
                        </span>
                      )}
                      {v.heart_rate && (
                        <span className="mr-3">HR: {v.heart_rate}</span>
                      )}
                      {v.temp_c && <span>Temp: {v.temp_c}°C</span>}
                    </div>
                  </div>
                  <OverallBadge value={v.overall} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Role-based message for nurses */}
      {isNurse && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">
                Awaiting Doctor Review
              </h3>
              <p className="mt-1 text-sm text-blue-800">
                You've completed the nurse assessment. A doctor will continue
                the encounter with clinical documentation, labs, and
                prescription when ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lab Order Modal */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                  <FlaskConical className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Order Lab Tests
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLabModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {labSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {labSuccess}
              </div>
            )}

            {labError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {labError}
              </div>
            )}

            <form onSubmit={handleSubmitLabOrder} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Select Tests
                </label>
                {loadingLabCatalog ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading lab catalog...
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                    {labCatalog.map((test) => (
                      <label
                        key={test.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(test.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTests([...selectedTests, test.id]);
                            } else {
                              setSelectedTests(
                                selectedTests.filter((id) => id !== test.id)
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">
                          {test.name}{" "}
                          {test.code && (
                            <span className="text-xs text-slate-500">
                              ({test.code})
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Priority
                </label>
                <select
                  value={labPriority}
                  onChange={(e) => setLabPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="STAT">STAT</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Clinical Notes (Optional)
                </label>
                <textarea
                  value={labNotes}
                  onChange={(e) => setLabNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional clinical information..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={labSubmitting || selectedTests.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {labSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FlaskConical className="h-4 w-4" />
                  )}
                  Create Lab Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                  <Pill className="h-4 w-4 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Create Prescription
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPrescriptionModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {prescriptionSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {prescriptionSuccess}
              </div>
            )}

            {prescriptionError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {prescriptionError}
              </div>
            )}

            <form onSubmit={handleSubmitPrescription} className="space-y-4">
              {loadingDrugCatalog ? (
                <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading drug catalog...
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Medications
                    </label>
                    {prescriptionItems.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-200 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">
                            Medication {index + 1}
                          </span>
                          {prescriptionItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemovePrescriptionItem(index)
                              }
                              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Drug
                            </label>
                            <select
                              value={item.drug}
                              onChange={(e) =>
                                handlePrescriptionItemChange(
                                  index,
                                  "drug",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              required
                            >
                              <option value="">Select medication...</option>
                              {drugCatalog.map((drug) => (
                                <option key={drug.id} value={drug.id}>
                                  {drug.name}{" "}
                                  {drug.strength && `${drug.strength}`}{" "}
                                  {drug.form && `- ${drug.form}`}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Dose
                            </label>
                            <input
                              type="text"
                              value={item.dose}
                              onChange={(e) =>
                                handlePrescriptionItemChange(
                                  index,
                                  "dose",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., 500mg"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Frequency
                            </label>
                            <input
                              type="text"
                              value={item.frequency}
                              onChange={(e) =>
                                handlePrescriptionItemChange(
                                  index,
                                  "frequency",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., 3 times daily"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Duration (days)
                            </label>
                            <input
                              type="number"
                              value={item.duration_days}
                              onChange={(e) =>
                                handlePrescriptionItemChange(
                                  index,
                                  "duration_days",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., 7"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">
                              Instructions
                            </label>
                            <input
                              type="text"
                              value={item.instructions}
                              onChange={(e) =>
                                handlePrescriptionItemChange(
                                  index,
                                  "instructions",
                                  e.target.value
                                )
                              }
                              placeholder="e.g., Take with food"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddPrescriptionItem}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Medication
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Prescription Notes (Optional)
                    </label>
                    <textarea
                      value={prescriptionNotes}
                      onChange={(e) => setPrescriptionNotes(e.target.value)}
                      rows={3}
                      placeholder="Additional instructions or notes..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    prescriptionSubmitting ||
                    prescriptionItems.every((item) => !item.drug)
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {prescriptionSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pill className="h-4 w-4" />
                  )}
                  Create Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allergies Modal */}
      {showAllergiesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Patient Allergies
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAllergiesModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Existing Allergies List */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-slate-700">
                Recorded Allergies
              </h3>
              {loadingAllergies ? (
                <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading allergies...
                </div>
              ) : allergies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  No allergies recorded for this patient
                </div>
              ) : (
                <div className="space-y-2">
                  {allergies.map((allergy) => (
                    <div
                      key={allergy.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {allergy.allergen}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                allergy.severity === "LIFE_THREATENING"
                                  ? "bg-red-100 text-red-700"
                                  : allergy.severity === "SEVERE"
                                  ? "bg-orange-100 text-orange-700"
                                  : allergy.severity === "MODERATE"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {allergy.severity}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {allergy.allergy_type}{" "}
                            {allergy.reaction &&
                              `• Reaction: ${allergy.reaction}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Allergy Form */}
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-700">
                Add New Allergy
              </h3>

              {allergySuccess && (
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
                  {allergySuccess}
                </div>
              )}

              {allergyError && (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">
                  {allergyError}
                </div>
              )}

              <form onSubmit={handleSubmitAllergy} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Allergen *
                    </label>
                    <input
                      type="text"
                      value={allergyForm.allergen}
                      onChange={(e) =>
                        setAllergyForm({
                          ...allergyForm,
                          allergen: e.target.value,
                        })
                      }
                      placeholder="e.g., Penicillin"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Type
                    </label>
                    <select
                      value={allergyForm.allergy_type}
                      onChange={(e) =>
                        setAllergyForm({
                          ...allergyForm,
                          allergy_type: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="DRUG">Drug</option>
                      <option value="FOOD">Food</option>
                      <option value="ENVIRONMENTAL">Environmental</option>
                      <option value="INSECT">Insect</option>
                      <option value="LATEX">Latex</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Severity
                    </label>
                    <select
                      value={allergyForm.severity}
                      onChange={(e) =>
                        setAllergyForm({
                          ...allergyForm,
                          severity: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="MILD">Mild</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="SEVERE">Severe</option>
                      <option value="LIFE_THREATENING">Life-threatening</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Reaction
                    </label>
                    <input
                      type="text"
                      value={allergyForm.reaction}
                      onChange={(e) =>
                        setAllergyForm({
                          ...allergyForm,
                          reaction: e.target.value,
                        })
                      }
                      placeholder="e.g., Rash, swelling"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Notes
                    </label>
                    <textarea
                      value={allergyForm.notes}
                      onChange={(e) =>
                        setAllergyForm({
                          ...allergyForm,
                          notes: e.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Additional notes..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={allergySubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {allergySubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                    Add Allergy
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllergiesModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                  <Bell className="h-4 w-4 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Set Reminder
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reminderSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {reminderSuccess}
                </div>
              </div>
            )}

            {reminderError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {reminderError}
              </div>
            )}

            <form onSubmit={handleSubmitReminder} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reminder Message
                </label>
                <textarea
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  rows={3}
                  placeholder="e.g., Recheck vitals in 2 hours, follow up on lab results..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reminder Time
                </label>
                <input
                  type="datetime-local"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reminderSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {reminderSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  Set Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}