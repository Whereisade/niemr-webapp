"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { finalizeEncounterNote, resumeEncounter } from "@/lib/encounterActions";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Save,
  Lock,
  ChevronRight,
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

export default function ProviderEncounterClinicalPage() {
  const params = useParams();
  const router = useRouter();
  const encounterId = params?.id;

  const [me, setMe] = useState(null);
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");

  // Form
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [ros, setRos] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [diagnoses, setDiagnoses] = useState("");
  const [plan, setPlan] = useState("");

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

      setChiefComplaint(data?.chief_complaint || "");
      setHpi(data?.hpi || "");
      setRos(data?.ros || "");
      setPhysicalExam(data?.physical_exam || "");
      setDiagnoses(data?.diagnoses || "");
      setPlan(data?.plan || "");
    } catch (err) {
      setError(err?.message || "Failed to load encounter.");
      setEncounter(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadEncounter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  const role = String(me?.role || "").toUpperCase();
  const canEdit = useMemo(() => ["DOCTOR", "ADMIN", "SUPER_ADMIN"].includes(role), [role]);

  const isWaitingLabs = String(encounter?.status || "").toUpperCase() === "WAITING_LABS";
  const isCrossedOut = String(encounter?.status || "").toUpperCase() === "CROSSED_OUT";
  const isLocked = Boolean(encounter?.locked || encounter?.locked_at);

  const readOnly = !canEdit || isWaitingLabs || isCrossedOut || isLocked;

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

  return (
    <div className="p-6">
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

          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Diagnosis & SOAP Note
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Encounter #{encounterId}</span>
            <span>•</span>
            <span>
              Status:{" "}
              <span className="font-medium text-slate-900">{encounter?.status || "—"}</span>
            </span>
            {isLocked ? (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                  <Lock className="h-4 w-4" />
                  Locked
                </span>
              </>
            ) : null}
            {lockDueAt ? (
              <>
                <span>•</span>
                <span>
                  Lock due:{" "}
                  <span className="font-medium text-slate-900">{fmtDateTime(lockDueAt)}</span>
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/provider/encounters/${encounterId}/workflow/labs`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Order Labs
          </Link>

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
          This encounter is locked (clinical fields are read-only).
        </div>
      ) : null}

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

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={saving || readOnly}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
    </div>
  );
}
