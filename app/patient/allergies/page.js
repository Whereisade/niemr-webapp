// app/patient/allergies/page.js
"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  X,
  ShieldAlert,
  Pill,
  Apple,
  TreeDeciduous,
  Bug,
  CircleDot,
  HelpCircle,
} from "lucide-react";
import {
  fetchMyAllergies,
  createAllergy,
  updateAllergy,
  deleteAllergy,
  ALLERGY_SEVERITIES,
  ALLERGY_TYPES,
} from "@/lib/allergies";

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

function normalizeAllergies(body) {
  if (!body) return [];
  if (Array.isArray(body?.results)) return body.results;
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

function getAllergyTypeIcon(type) {
  switch (type) {
    case "DRUG":
      return Pill;
    case "FOOD":
      return Apple;
    case "ENVIRONMENTAL":
      return TreeDeciduous;
    case "INSECT":
      return Bug;
    case "LATEX":
      return CircleDot;
    default:
      return HelpCircle;
  }
}

function getSeverityBadgeClass(severity) {
  switch (severity) {
    case "MILD":
      return "bg-green-50 text-green-700 ring-green-200";
    case "MODERATE":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "SEVERE":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "LIFE_THREATENING":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

export default function PatientAllergiesPage() {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [allergen, setAllergen] = useState("");
  const [allergyType, setAllergyType] = useState("DRUG");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState("MODERATE");
  const [onsetDate, setOnsetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchMyAllergies();
        if (cancelled) return;
        setAllergies(normalizeAllergies(res));
      } catch (err) {
        console.error("Failed to load allergies", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load your allergies. Please try again."
          );
          setAllergies([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setAllergen("");
    setAllergyType("DRUG");
    setReaction("");
    setSeverity("MODERATE");
    setOnsetDate("");
    setNotes("");
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(allergy) {
    setEditingId(allergy.id);
    setAllergen(allergy.allergen || "");
    setAllergyType(allergy.allergy_type || allergy.type || "DRUG");
    setReaction(allergy.reaction || "");
    setSeverity(allergy.severity || "MODERATE");
    setOnsetDate(allergy.onset_date || "");
    setNotes(allergy.notes || "");
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!allergen.trim()) {
      setError("Please enter what you are allergic to.");
      return;
    }

    const payload = {
      allergen: allergen.trim(),
      allergy_type: allergyType,
      reaction: reaction.trim() || null,
      severity,
      onset_date: onsetDate || null,
      notes: notes.trim() || null,
    };

    try {
      setSubmitting(true);

      if (editingId) {
        const updated = await updateAllergy(editingId, payload);
        setAllergies((prev) =>
          prev.map((a) => (a.id === editingId ? updated : a))
        );
        setSuccess("Allergy updated successfully.");
      } else {
        const created = await createAllergy(payload);
        setAllergies((prev) => [created, ...prev]);
        setSuccess("Allergy added successfully.");
      }

      resetForm();
    } catch (err) {
      console.error("Failed to save allergy", err);
      const detail =
        err?.detail ||
        (err?.data && JSON.stringify(err.data)) ||
        err?.message;
      setError(
        detail || "Failed to save allergy. Please check the fields and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    const ok = window.confirm(
      "Are you sure you want to delete this allergy record?"
    );
    if (!ok) return;

    try {
      await deleteAllergy(id);
      setAllergies((prev) => prev.filter((a) => a.id !== id));
      setSuccess("Allergy deleted successfully.");
    } catch (err) {
      console.error("Failed to delete allergy", err);
      setError(err?.message || "Failed to delete allergy. Please try again.");
    }
  }

  const totalAllergies = allergies.length;
  const severeCount = allergies.filter(
    (a) => a.severity === "SEVERE" || a.severity === "LIFE_THREATENING"
  ).length;
  const drugAllergies = allergies.filter(
    (a) => a.allergy_type === "DRUG" || a.type === "DRUG"
  ).length;

  return (
    <main className="relative mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* Background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-red-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-amber-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          My Allergies
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Allergy Information
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Keep your allergy information up to date so your care team can
            provide safe treatment. This information is shared with your
            healthcare providers.
          </p>
        </div>
      </header>

      {/* Quick stats */}
      <section className="relative grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Total allergies
            </p>
            <p className="text-lg font-semibold text-slate-900">{totalAllergies}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Severe / Life-threatening
            </p>
            <p className="text-lg font-semibold text-slate-900">{severeCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <Pill className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Drug allergies
            </p>
            <p className="text-lg font-semibold text-slate-900">{drugAllergies}</p>
          </div>
        </div>
      </section>

      {/* Alerts */}
      {error && (
        <div className="relative rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="relative rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm ? (
        <section className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {editingId ? "Edit allergy" : "Add a new allergy"}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Provide details about the allergy so your care team is informed.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Allergen (what are you allergic to?) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={allergen}
                onChange={(e) => {
                  setAllergen(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Penicillin, Peanuts, Dust mites"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Type of allergy
              </label>
              <select
                value={allergyType}
                onChange={(e) => setAllergyType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ALLERGY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ALLERGY_SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Reaction (what happens when exposed?)
              </label>
              <input
                type="text"
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Rash, difficulty breathing, swelling"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                When did this allergy start? (optional)
              </label>
              <input
                type="date"
                value={onsetDate}
                onChange={(e) => setOnsetDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Additional notes (optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Any other details your doctor should know"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting
                  ? "Saving…"
                  : editingId
                  ? "Update allergy"
                  : "Add allergy"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="relative">
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add allergy
          </button>
        </section>
      )}

      {/* Allergies list */}
      <section className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">
          My recorded allergies
        </h2>
        <p className="text-xs text-slate-600 mb-4">
          This information is visible to your healthcare providers during visits.
        </p>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading allergies…</span>
          </p>
        )}

        {!loading && !allergies.length && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-slate-100">
              <AlertTriangle className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">
              No allergies recorded
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add your known allergies to help your care team provide safe
              treatment.
            </p>
          </div>
        )}

        {!loading && allergies.length > 0 && (
          <div className="space-y-3">
            {allergies.map((allergy) => {
              const TypeIcon = getAllergyTypeIcon(
                allergy.allergy_type || allergy.type
              );
              const severityClass = getSeverityBadgeClass(allergy.severity);
              const typeLabel =
                ALLERGY_TYPES.find(
                  (t) => t.value === (allergy.allergy_type || allergy.type)
                )?.label || "Other";

              return (
                <div
                  key={allergy.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
                        <TypeIcon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {allergy.allergen}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${severityClass}`}
                          >
                            {allergy.severity?.replace("_", " ") || "Unknown"}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {typeLabel}
                          </span>
                        </div>
                        {allergy.reaction && (
                          <p className="mt-1 text-xs text-slate-700">
                            <span className="font-medium">Reaction:</span>{" "}
                            {allergy.reaction}
                          </p>
                        )}
                        {allergy.notes && (
                          <p className="mt-1 text-xs text-slate-600">
                            {allergy.notes}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                          {allergy.onset_date && (
                            <span>Since: {formatDate(allergy.onset_date)}</span>
                          )}
                          {allergy.created_at && (
                            <span>
                              Added: {formatDate(allergy.created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(allergy)}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(allergy.id)}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Info box for provider/facility access */}
      {/* <section className="relative rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <ShieldAlert className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xs text-blue-900">
            <p className="font-semibold">For Healthcare Providers</p>
            <p className="mt-1">
              If you are a healthcare provider viewing this patient's record,
              you can access allergy information from the patient chart at{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-[11px]">
                /facility/patients/[id]/allergies
              </code>{" "}
              or{" "}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-[11px]">
                /provider/patients/[id]/allergies
              </code>
            </p>
          </div>
        </div>
      </section> */}
    </main>
  );
}