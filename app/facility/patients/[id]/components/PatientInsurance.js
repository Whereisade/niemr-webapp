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
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  Award,
} from "lucide-react";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.results && Array.isArray(payload.results)) return payload.results;
  return [];
}

export default function PatientInsurance({ patientId }) {
  const [patient, setPatient] = useState(null);
  
  // Legacy HMOs (facility-scoped)
  const [legacyHMOs, setLegacyHMOs] = useState([]);
  
  // System HMOs with tiers
  const [systemHMOs, setSystemHMOs] = useState([]);
  const [facilityHMOs, setFacilityHMOs] = useState([]);
  
  // HMO Approvals
  const [approvals, setApprovals] = useState([]);
  const [pendingApproval, setPendingApproval] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form state for System HMO
  const [selectedSystemHMO, setSelectedSystemHMO] = useState("");
  const [selectedTier, setSelectedTier] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  
  // UI state
  const [hmoMode, setHmoMode] = useState("system"); // "system" or "legacy"
  const [selectedHMOTiers, setSelectedHMOTiers] = useState([]);

  useEffect(() => {
    loadData();
  }, [patientId]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [patientRes, facilityHMOsRes, systemHMOsRes, approvalsRes] = await Promise.all([
        apiFetch(`/patients/${patientId}/`),
        apiFetch("/patients/hmo/facility/").catch(() => ({ results: [] })),
        apiFetch("/patients/hmo/system/dropdown/").catch(() => []),
        apiFetch(`/patients/hmo-approvals/?patient=${patientId}`).catch(() => ({ results: [] })),
      ]);

      setPatient(patientRes);
      setFacilityHMOs(normalizeList(facilityHMOsRes));
      setSystemHMOs(Array.isArray(systemHMOsRes) ? systemHMOsRes : []);
      setApprovals(normalizeList(approvalsRes));
      
      // Check for pending approval
      const pending = normalizeList(approvalsRes).find(a => a.status === 'PENDING');
      setPendingApproval(pending || null);

      // Pre-fill form if patient has System HMO enrollment
      if (patientRes.system_hmo) {
        setHmoMode("system");
        setSelectedSystemHMO(String(patientRes.system_hmo));
        setSelectedTier(patientRes.hmo_tier ? String(patientRes.hmo_tier) : "");
        setInsuranceNumber(patientRes.insurance_number || "");
        setExpiryDate(patientRes.insurance_expiry || "");
        setNotes(patientRes.insurance_notes || "");
        
        // Load tiers for the selected HMO
        const hmo = Array.isArray(systemHMOsRes) 
          ? systemHMOsRes.find(h => h.id === patientRes.system_hmo)
          : null;
        if (hmo) {
          setSelectedHMOTiers(hmo.tiers || []);
        }
      } else {
        // Clear form if no insurance
        setSelectedSystemHMO("");
        setSelectedTier("");
        setInsuranceNumber("");
        setExpiryDate("");
        setNotes("");
        setSelectedHMOTiers([]);
      }
    } catch (e) {
      setError(e?.message || "Failed to load patient insurance data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSystemHMOChange(hmoId) {
    setSelectedSystemHMO(hmoId);
    setSelectedTier(""); // Reset tier selection
    
    if (!hmoId) {
      setSelectedHMOTiers([]);
      return;
    }
    
    // Find the HMO and get its tiers
    const hmo = systemHMOs.find(h => h.id === Number(hmoId));
    if (hmo && hmo.tiers) {
      setSelectedHMOTiers(hmo.tiers);
      // Auto-select tier if only one available
      if (hmo.tiers.length === 1) {
        setSelectedTier(String(hmo.tiers[0].id));
      }
    } else {
      setSelectedHMOTiers([]);
    }
  }

  async function handleAttachSystemHMO() {
    if (!selectedSystemHMO) {
      setError("Please select an HMO");
      return;
    }
    
    if (!selectedTier) {
      setError("Please select a tier");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        system_hmo_id: Number(selectedSystemHMO),
        tier_id: Number(selectedTier),
        insurance_number: insuranceNumber.trim() || "",
        insurance_expiry: expiryDate || "",
        insurance_notes: notes.trim() || "",
      };

      const response = await apiFetch(`/patients/${patientId}/attach-system-hmo/`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Check if approval is required
      if (response.status === 'approval_required') {
        setSuccess("HMO transfer requires approval. Request has been submitted.");
        setPendingApproval({ id: response.approval_id, status: 'PENDING' });
      } else {
        setSuccess("Patient successfully attached to HMO");
      }
      
      setEditing(false);
      await loadData();
    } catch (e) {
      setError(e?.message || "Failed to attach patient to HMO");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearSystemHMO() {
    const ok = window.confirm(
      "Remove this patient from their HMO plan? This will clear all insurance information."
    );
    if (!ok) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/patients/${patientId}/clear-system-hmo/`, {
        method: "POST",
      });

      setSuccess("Patient removed from HMO");
      setSelectedSystemHMO("");
      setSelectedTier("");
      setInsuranceNumber("");
      setExpiryDate("");
      setNotes("");
      setSelectedHMOTiers([]);
      setEditing(false);
      await loadData();
    } catch (e) {
      setError(e?.message || "Failed to remove patient from HMO");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprovalDecision(approvalId, action) {
    if (!window.confirm(`Are you sure you want to ${action} this HMO transfer?`)) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/patients/hmo-approvals/${approvalId}/decide/`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });

      setSuccess(`HMO transfer ${action}d successfully`);
      await loadData();
    } catch (e) {
      setError(e?.message || `Failed to ${action} HMO transfer`);
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
    if (patient?.system_hmo) {
      setSelectedSystemHMO(String(patient.system_hmo));
      setSelectedTier(patient.hmo_tier ? String(patient.hmo_tier) : "");
      setInsuranceNumber(patient.insurance_number || "");
      setExpiryDate(patient.insurance_expiry || "");
      setNotes(patient.insurance_notes || "");
      
      // Reload tiers
      const hmo = systemHMOs.find(h => h.id === patient.system_hmo);
      if (hmo) {
        setSelectedHMOTiers(hmo.tiers || []);
      }
    } else {
      setSelectedSystemHMO("");
      setSelectedTier("");
      setInsuranceNumber("");
      setExpiryDate("");
      setNotes("");
      setSelectedHMOTiers([]);
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

  // Determine insurance status
  const hasSystemHMO = Boolean(patient?.system_hmo);
  const currentSystemHMO = hasSystemHMO 
    ? systemHMOs.find(h => h.id === patient.system_hmo)
    : null;
  const currentTier = patient?.hmo_tier
    ? (currentSystemHMO?.tiers || []).find(t => t.id === patient.hmo_tier)
    : null;
  
  const isExpired = patient?.insurance_expiry
    ? new Date(patient.insurance_expiry) < new Date()
    : false;

  // Get enabled HMOs for dropdown
  const enabledHMOIds = new Set(facilityHMOs.map(fh => fh.system_hmo?.id || fh.system_hmo));
  const enabledSystemHMOs = systemHMOs.filter(h => enabledHMOIds.has(h.id));

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
              <p className="text-sm text-slate-600">Manage HMO enrollment and insurance details</p>
            </div>
          </div>

          {!editing && (
            <div className="flex items-center gap-2">
              {hasSystemHMO && (
                <button
                  onClick={handleClearSystemHMO}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Remove HMO
                </button>
              )}
              <button
                onClick={startEditing}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Edit2 className="h-4 w-4" />
                {hasSystemHMO ? "Update Insurance" : "Attach to HMO"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      <div className="px-6 pt-4">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="mt-1 text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="shrink-0 text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">Success</p>
              <p className="mt-1 text-sm text-emerald-800">{success}</p>
            </div>
            <button
              onClick={() => setSuccess("")}
              className="shrink-0 text-emerald-400 hover:text-emerald-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Pending Approval Notice */}
        {pendingApproval && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">HMO Transfer Pending</p>
              <p className="mt-1 text-sm text-amber-800">
                This patient's HMO enrollment transfer is awaiting approval.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="p-6">
        {editing ? (
          // Edit Mode
          <div className="space-y-6">
            {/* HMO Selection */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building className="h-4 w-4" />
                Select HMO Plan <span className="text-red-500">*</span>
              </label>
              {enabledSystemHMOs.length === 0 ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" />
                  <p className="mt-2 text-sm font-medium text-amber-900">No HMOs Enabled</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Your facility hasn't enabled any HMOs yet. Please contact your administrator.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedSystemHMO}
                  onChange={(e) => handleSystemHMOChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  disabled={saving}
                >
                  <option value="">-- Select HMO --</option>
                  {enabledSystemHMOs.map((hmo) => (
                    <option key={hmo.id} value={hmo.id}>
                      {hmo.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tier Selection */}
            {selectedSystemHMO && selectedHMOTiers.length > 0 && (
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Award className="h-4 w-4" />
                  Select Tier <span className="text-red-500">*</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {selectedHMOTiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(String(tier.id))}
                      disabled={saving}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                        selectedTier === String(tier.id)
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      } disabled:opacity-50`}
                    >
                      <Award className={`h-6 w-6 ${
                        selectedTier === String(tier.id) ? "text-blue-600" : "text-slate-400"
                      }`} />
                      <div>
                        <p className={`text-sm font-semibold ${
                          selectedTier === String(tier.id) ? "text-blue-900" : "text-slate-900"
                        }`}>
                          {tier.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">Level {tier.level}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                placeholder="e.g., INS-123456"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional. The patient's insurance ID number.
              </p>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Calendar className="h-4 w-4" />
                Coverage Expiry Date
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
                onClick={handleAttachSystemHMO}
                disabled={saving || !selectedSystemHMO || !selectedTier}
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
            {hasSystemHMO && currentSystemHMO ? (
              // Patient HAS insurance and HMO is found
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
                    value={currentSystemHMO.name}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                  />

                  {currentTier && (
                    <DetailCard
                      icon={Award}
                      label="Coverage Tier"
                      value={`${currentTier.name} (Level ${currentTier.level})`}
                      iconBg="bg-purple-100"
                      iconColor="text-purple-600"
                    />
                  )}

                  <DetailCard
                    icon={CreditCard}
                    label="Insurance Number"
                    value={patient.insurance_number || "Not provided"}
                    iconBg="bg-indigo-100"
                    iconColor="text-indigo-600"
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
                    value={isExpired ? "EXPIRED" : "ACTIVE"}
                    iconBg={isExpired ? "bg-amber-100" : "bg-emerald-100"}
                    iconColor={isExpired ? "text-amber-600" : "text-emerald-600"}
                  />

                  {patient.hmo_enrollment_facility_name && (
                    <DetailCard
                      icon={Building}
                      label="Enrolled At"
                      value={patient.hmo_enrollment_facility_name}
                      iconBg="bg-slate-100"
                      iconColor="text-slate-600"
                    />
                  )}
                </div>

                {/* Enrollment Info */}
                {patient.hmo_enrolled_at && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Info className="h-4 w-4" />
                      Enrollment Information
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Enrolled on {new Date(patient.hmo_enrolled_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}

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
              // Patient DOES NOT have insurance
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