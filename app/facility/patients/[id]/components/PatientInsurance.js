"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Shield,
  Check,
  X,
  AlertCircle,
  Loader2,
  Edit2,
  Save,
  FileText,
  Calendar,
  User,
  Building,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

export default function PatientInsurance({ patientId }) {
  const [patient, setPatient] = useState(null);
  const [hmos, setHmos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [selectedHMO, setSelectedHMO] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, [patientId]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [patientRes, hmosRes] = await Promise.all([
        apiFetch(`/patients/${patientId}/`),
        apiFetch("/facilities/hmos/"),
      ]);

      setPatient(patientRes);
      setHmos(normalizeList(hmosRes).filter((h) => h.is_active));

      // Pre-fill form if patient has insurance
      if (patientRes.hmo) {
        setSelectedHMO(String(patientRes.hmo));
        setInsuranceNumber(patientRes.insurance_number || "");
        setExpiryDate(patientRes.insurance_expiry || "");
        setNotes(patientRes.insurance_notes || "");
      }
    } catch (e) {
      setError(e?.message || "Failed to load patient insurance data");
    } finally {
      setLoading(false);
    }
  }

  async function handleAttach() {
    if (!selectedHMO) {
      setError("Please select an HMO");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        hmo_id: Number(selectedHMO),
        insurance_number: insuranceNumber.trim() || null,
        insurance_expiry: expiryDate || null,
        insurance_notes: notes.trim() || null,
      };

      await apiFetch(`/patients/${patientId}/attach-hmo/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess("Patient successfully attached to HMO");
      setEditing(false);
      await loadData();
    } catch (e) {
      setError(e?.message || "Failed to attach patient to HMO");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    const ok = window.confirm(
      "Remove this patient from their HMO plan? This will clear all insurance information."
    );
    if (!ok) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/patients/${patientId}/clear-hmo/`, {
        method: "POST",
      });

      setSuccess("Patient removed from HMO");
      setSelectedHMO("");
      setInsuranceNumber("");
      setExpiryDate("");
      setNotes("");
      setEditing(false);
      await loadData();
    } catch (e) {
      setError(e?.message || "Failed to remove patient from HMO");
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setEditing(true);
    setError("");
    setSuccess("");
  }

  function cancelEditing() {
    setEditing(false);
    setError("");
    setSuccess("");

    // Reset form to current patient data
    if (patient?.hmo) {
      setSelectedHMO(String(patient.hmo));
      setInsuranceNumber(patient.insurance_number || "");
      setExpiryDate(patient.insurance_expiry || "");
      setNotes(patient.insurance_notes || "");
    } else {
      setSelectedHMO("");
      setInsuranceNumber("");
      setExpiryDate("");
      setNotes("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="text-sm text-slate-600">Loading insurance information...</span>
      </div>
    );
  }

  const currentHMO = hmos.find((h) => h.id === patient?.hmo);
  const isExpired = patient?.insurance_expiry
    ? new Date(patient.insurance_expiry) < new Date()
    : false;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Insurance Information</h2>
              <p className="text-sm text-slate-600">Manage HMO attachment and insurance details</p>
            </div>
          </div>

          {!editing && (
            <div className="flex items-center gap-2">
              {patient?.hmo && (
                <button
                  onClick={handleClear}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Remove HMO
                </button>
              )}
              <button
                onClick={startEditing}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <Edit2 className="h-4 w-4" />
                {patient?.hmo ? "Edit Insurance" : "Attach to HMO"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="px-6 pt-4">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">Success</p>
              <p className="mt-1 text-sm text-emerald-800">{success}</p>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {editing ? (
          // Edit Form
          <div className="space-y-6">
            {/* HMO Selection */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building className="h-4 w-4" />
                HMO Plan
                <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedHMO}
                onChange={(e) => setSelectedHMO(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={saving}
              >
                <option value="">Select HMO...</option>
                {hmos.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {hmos.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No active HMOs available. Please create an HMO first.
                </p>
              )}
            </div>

            {/* Insurance Number */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4" />
                Insurance Number
              </label>
              <input
                type="text"
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                placeholder="e.g., NHIS/12345678"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional. The patient's insurance card number or policy ID.
              </p>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Calendar className="h-4 w-4" />
                Insurance Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional. When the insurance coverage expires.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="h-4 w-4" />
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional insurance information, coverage details, special instructions..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={saving}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleAttach}
                disabled={saving || !selectedHMO}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save Insurance Info"}
              </button>
            </div>
          </div>
        ) : (
          // Display Mode
          <div>
            {patient?.hmo && currentHMO ? (
              <div className="space-y-6">
                {/* Insurance Status Banner */}
                <div className={`flex items-start gap-3 rounded-xl border p-4 ${
                  isExpired
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}>
                  {isExpired ? (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  ) : (
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${
                      isExpired ? "text-amber-900" : "text-emerald-900"
                    }`}>
                      {isExpired ? "Insurance Expired" : "Active Insurance"}
                    </p>
                    <p className={`mt-1 text-sm ${
                      isExpired ? "text-amber-800" : "text-emerald-800"
                    }`}>
                      {isExpired
                        ? "This patient's insurance has expired. Please update or renew."
                        : "This patient is covered by HMO insurance. Applicable prices will be applied automatically."}
                    </p>
                  </div>
                </div>

                {/* Insurance Details Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailCard
                    icon={Building}
                    label="HMO Plan"
                    value={currentHMO.name}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                  />

                  <DetailCard
                    icon={CreditCard}
                    label="Insurance Number"
                    value={patient.insurance_number || "Not provided"}
                    iconBg="bg-purple-100"
                    iconColor="text-purple-600"
                    dimmed={!patient.insurance_number}
                  />

                  <DetailCard
                    icon={Calendar}
                    label="Expiry Date"
                    value={
                      patient.insurance_expiry
                        ? new Date(patient.insurance_expiry).toLocaleDateString()
                        : "Not specified"
                    }
                    iconBg={isExpired ? "bg-amber-100" : "bg-emerald-100"}
                    iconColor={isExpired ? "text-amber-600" : "text-emerald-600"}
                    dimmed={!patient.insurance_expiry}
                  />

                  <DetailCard
                    icon={User}
                    label="Insurance Status"
                    value={patient.insurance_status || "ACTIVE"}
                    iconBg="bg-slate-100"
                    iconColor="text-slate-600"
                  />
                </div>

                {/* Notes Section */}
                {patient.insurance_notes && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <FileText className="h-4 w-4" />
                      Additional Notes
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {patient.insurance_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // No Insurance
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-slate-200">
                  <Shield className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No Insurance Attached</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This patient is not currently attached to any HMO plan.
                  <br />
                  Standard pricing will apply for all services.
                </p>
                <button
                  onClick={startEditing}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <Shield className="h-4 w-4" />
                  Attach to HMO
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value, iconBg, iconColor, dimmed = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={`mt-1 text-sm font-semibold ${
            dimmed ? "text-slate-400 italic" : "text-slate-900"
          }`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}