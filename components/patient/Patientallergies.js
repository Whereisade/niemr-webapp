"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Pill,
  Apple,
  TreeDeciduous,
  Bug,
  CircleDot,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";

const ALLERGY_TYPES = [
  { value: "DRUG", label: "Drug / Medication" },
  { value: "FOOD", label: "Food" },
  { value: "ENVIRONMENTAL", label: "Environmental" },
  { value: "INSECT", label: "Insect" },
  { value: "LATEX", label: "Latex" },
  { value: "OTHER", label: "Other" },
];

const ALLERGY_SEVERITIES = [
  { value: "MILD", label: "Mild", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "MODERATE", label: "Moderate", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "SEVERE", label: "Severe", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "LIFE_THREATENING", label: "Life-threatening", color: "bg-red-100 text-red-700 border-red-200" },
];

function getTypeIcon(type) {
  switch (type) {
    case "DRUG":
      return <Pill className="h-4 w-4" />;
    case "FOOD":
      return <Apple className="h-4 w-4" />;
    case "ENVIRONMENTAL":
      return <TreeDeciduous className="h-4 w-4" />;
    case "INSECT":
      return <Bug className="h-4 w-4" />;
    case "LATEX":
      return <CircleDot className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
}

function getSeverityStyle(severity) {
  const found = ALLERGY_SEVERITIES.find((s) => s.value === severity);
  return found?.color || "bg-slate-100 text-slate-700 border-slate-200";
}

function getSeverityLabel(severity) {
  const found = ALLERGY_SEVERITIES.find((s) => s.value === severity);
  return found?.label || severity;
}

function getTypeLabel(type) {
  const found = ALLERGY_TYPES.find((t) => t.value === type);
  return found?.label || type;
}

export default function PatientAllergies({ patientId }) {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    allergen: "",
    allergy_type: "OTHER",
    severity: "MODERATE",
    reaction: "",
    onset_date: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    loadAllergies();
  }, [patientId]);

  async function loadAllergies() {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch(`/patients/allergies/?patient=${patientId}`);
      const items = Array.isArray(data) ? data : data?.results || [];
      setAllergies(items);
    } catch (err) {
      console.error("Failed to load allergies", err);
      setError("Unable to load allergies.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      allergen: "",
      allergy_type: "OTHER",
      severity: "MODERATE",
      reaction: "",
      onset_date: "",
      notes: "",
    });
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(allergy) {
    setFormData({
      allergen: allergy.allergen || "",
      allergy_type: allergy.allergy_type || "OTHER",
      severity: allergy.severity || "MODERATE",
      reaction: allergy.reaction || "",
      onset_date: allergy.onset_date || "",
      notes: allergy.notes || "",
    });
    setEditingId(allergy.id);
    setShowForm(true);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!formData.allergen.trim()) {
      setFormError("Allergen is required.");
      return;
    }

    const payload = {
      ...formData,
      allergen: formData.allergen.trim(),
      patient: patientId,
    };

    // Remove empty optional fields
    if (!payload.onset_date) delete payload.onset_date;
    if (!payload.reaction) delete payload.reaction;
    if (!payload.notes) delete payload.notes;

    setSubmitting(true);
    try {
      if (editingId) {
        await apiFetch(`/patients/allergies/${editingId}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/patients/allergies/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await loadAllergies();
    } catch (err) {
      console.error("Failed to save allergy", err);
      const msg = err?.allergen?.[0] || err?.message || "Failed to save allergy.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/patients/allergies/${deleteId}/`, { method: "DELETE" });
      setDeleteId(null);
      await loadAllergies();
    } catch (err) {
      console.error("Failed to delete allergy", err);
      setError("Failed to delete allergy.");
    } finally {
      setDeleting(false);
    }
  }

  const severeCount = allergies.filter(
    (a) => a.severity === "SEVERE" || a.severity === "LIFE_THREATENING"
  ).length;

  const drugCount = allergies.filter((a) => a.allergy_type === "DRUG").length;

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {allergies.length} recorded
        </div>
        {severeCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            {severeCount} severe/life-threatening
          </div>
        )}
        {drugCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700">
            <Pill className="h-3.5 w-3.5" />
            {drugCount} drug allergies
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add allergy
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingId ? "Edit allergy" : "Add new allergy"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Allergen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.allergen}
                  onChange={(e) =>
                    setFormData({ ...formData, allergen: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Penicillin, Peanuts"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Type
                </label>
                <select
                  value={formData.allergy_type}
                  onChange={(e) =>
                    setFormData({ ...formData, allergy_type: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ALLERGY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) =>
                    setFormData({ ...formData, severity: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ALLERGY_SEVERITIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Onset date
                </label>
                <input
                  type="date"
                  value={formData.onset_date}
                  onChange={(e) =>
                    setFormData({ ...formData, onset_date: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Reaction
              </label>
              <input
                type="text"
                value={formData.reaction}
                onChange={(e) =>
                  setFormData({ ...formData, reaction: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Rash, Anaphylaxis, Swelling"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  "Update"
                ) : (
                  "Add"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900">
                Delete this allergy?
              </h4>
              <p className="mt-1 text-xs text-red-700">
                This action cannot be undone. The allergy record will be permanently removed.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allergies list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading allergies…</span>
        </div>
      ) : allergies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-600">
            No allergies recorded
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Click &quot;Add allergy&quot; to record patient allergies.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allergies.map((allergy) => (
            <div
              key={allergy.id}
              className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Type icon */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    {getTypeIcon(allergy.allergy_type)}
                  </div>

                  <div>
                    {/* Allergen name */}
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {allergy.allergen}
                      </h4>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getSeverityStyle(
                          allergy.severity
                        )}`}
                      >
                        {getSeverityLabel(allergy.severity)}
                      </span>
                    </div>

                    {/* Type and reaction */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{getTypeLabel(allergy.allergy_type)}</span>
                      {allergy.reaction && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">
                            Reaction: {allergy.reaction}
                          </span>
                        </>
                      )}
                      {allergy.onset_date && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>
                            Onset:{" "}
                            {new Date(allergy.onset_date).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Notes */}
                    {allergy.notes && (
                      <p className="mt-2 text-xs text-slate-500">
                        {allergy.notes}
                      </p>
                    )}

                    {/* Recorded info */}
                    <div className="mt-2 text-[10px] text-slate-400">
                      Recorded{" "}
                      {allergy.created_at &&
                        new Date(allergy.created_at).toLocaleDateString()}
                      {allergy.recorded_by_name && (
                        <> by {allergy.recorded_by_name}</>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleEdit(allergy)}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(allergy.id)}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}