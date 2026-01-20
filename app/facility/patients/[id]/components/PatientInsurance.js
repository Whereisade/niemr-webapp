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
      // FIXED: Handle both object and ID responses from backend
      const systemHMOId = typeof patientRes.system_hmo === 'object' 
        ? patientRes.system_hmo?.id 
        : patientRes.system_hmo;
      
      const hmoTierId = typeof patientRes.hmo_tier === 'object'
        ? patientRes.hmo_tier?.id
        : patientRes.hmo_tier;

      if (systemHMOId) {
        setHmoMode("system");
        setSelectedSystemHMO(String(systemHMOId));
        setSelectedTier(hmoTierId ? String(hmoTierId) : "");
        setInsuranceNumber(patientRes.insurance_number || "");
        setExpiryDate(patientRes.insurance_expiry || "");
        setNotes(patientRes.insurance_notes || "");
        
        // Load tiers for the selected HMO
        const hmo = Array.isArray(systemHMOsRes) 
          ? systemHMOsRes.find(h => h.id === systemHMOId)
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

  async function handleApproveTransfer(approvalId, approvalDetails) {
    // Show confirmation dialog
    const shouldProceed = window.confirm(
      `Approve HMO transfer for patient from ${approvalDetails.original_facility_name || 'another facility'}?\n\n` +
      `This will allow the patient to continue using ${approvalDetails.system_hmo?.name || 'their HMO'} at your facility.`
    );
    
    if (!shouldProceed) return;
    
    const notes = window.prompt("Add approval notes (optional):");
    
    setSaving(true);
    setError("");
    setSuccess("");
    
    try {
      await apiFetch(`/patients/hmo-approvals/${approvalId}/decide/`, {
        method: "POST",
        body: JSON.stringify({
          action: "approve",
          notes: notes || "",
        }),
      });
      
      setSuccess("✓ HMO transfer approved! Patient can now use their HMO at this facility.");
      setPendingApproval(null);
      await loadData(); // Reload to show updated patient HMO status
    } catch (e) {
      setError(e?.message || "Failed to approve HMO transfer. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRejectTransfer(approvalId, approvalDetails) {
    // Get rejection reason
    const reason = window.prompt(
      `Why are you rejecting this HMO transfer request?\n\n` +
      `Patient: ${approvalDetails.patient_name || 'Unknown'}\n` +
      `From: ${approvalDetails.original_facility_name || 'Another facility'}\n\n` +
      `NOTE: Patient will be UNINSURED at your facility and use standard catalog prices.`,
      ""
    );
    
    if (reason === null) return; // User cancelled
    
    const confirmed = window.confirm(
      "Are you sure you want to reject this HMO transfer request?\n\n" +
      "⚠️ The patient will NOT be able to use their HMO at this facility.\n" +
      "They will be charged STANDARD CATALOG PRICES (uninsured rates).\n\n" +
      "Their HMO enrollment will remain at the original facility."
    );
    
    if (!confirmed) return;
    
    setSaving(true);
    setError("");
    setSuccess("");
    
    try {
      await apiFetch(`/patients/hmo-approvals/${approvalId}/decide/`, {
        method: "POST",
        body: JSON.stringify({
          action: "reject",
          notes: reason.trim() || "No reason provided",
        }),
      });
      
      setSuccess("HMO transfer request rejected. Patient will use standard pricing at this facility.");
      setPendingApproval(null);
      await loadData();
    } catch (e) {
      setError(e?.message || "Failed to reject transfer request. Please try again.");
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
    // Restore from patient data
    if (patient?.system_hmo) {
      const systemHMOId = typeof patient.system_hmo === 'object' 
        ? patient.system_hmo?.id 
        : patient.system_hmo;
      
      const hmoTierId = typeof patient.hmo_tier === 'object'
        ? patient.hmo_tier?.id
        : patient.hmo_tier;

      setSelectedSystemHMO(String(systemHMOId));
      setSelectedTier(hmoTierId ? String(hmoTierId) : "");
      setInsuranceNumber(patient.insurance_number || "");
      setExpiryDate(patient.insurance_expiry || "");
      setNotes(patient.insurance_notes || "");
    } else {
      setSelectedSystemHMO("");
      setSelectedTier("");
      setInsuranceNumber("");
      setExpiryDate("");
      setNotes("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Loading insurance information...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <p className="text-sm text-red-800">Patient data not found</p>
        </div>
      </div>
    );
  }

  // FIXED: Properly extract HMO data from patient object
  // Handle both nested object and ID responses
  const systemHMOId = typeof patient.system_hmo === 'object' 
    ? patient.system_hmo?.id 
    : patient.system_hmo;
  
  const hasSystemHMO = Boolean(systemHMOId);
  
  // If system_hmo is already an object, use it directly
  // Otherwise, look it up in the systemHMOs array
  const currentSystemHMO = typeof patient.system_hmo === 'object'
    ? patient.system_hmo
    : systemHMOs.find(h => h.id === systemHMOId);
  
  // Same for tier
  const currentTier = typeof patient.hmo_tier === 'object'
    ? patient.hmo_tier
    : selectedHMOTiers.find(t => t.id === (typeof patient.hmo_tier === 'object' ? patient.hmo_tier?.id : patient.hmo_tier));

  // Check if insurance is expired
  const isExpired = patient.insurance_expiry 
    ? new Date(patient.insurance_expiry) < new Date()
    : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Insurance Information</h2>
            <p className="text-sm text-slate-500">
              Manage patient's HMO enrollment and insurance details
            </p>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800">{success}</p>
        </div>
      )}

      {/* ========== PENDING HMO TRANSFER APPROVAL ========== */}
      {pendingApproval && (
        <div className="overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
          <div className="border-b border-amber-200 bg-amber-100 px-6 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">
                HMO Transfer Pending Approval
              </h3>
              <span className="ml-auto rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
                REQUIRES ACTION
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {/* Alert Message */}
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-4">
              <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  Patient Transfer Request
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  This patient was previously enrolled in this HMO at another facility. 
                  They're requesting to transfer their enrollment to your facility.
                </p>
                <p className="mt-2 text-xs font-medium text-amber-900">
                  ⚠️ If REJECTED: Patient will be UNINSURED at your facility and use standard catalog prices.
                </p>
              </div>
            </div>
            
            {/* Transfer Details Grid */}
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-100">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500">HMO Plan</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {pendingApproval.system_hmo?.name || "Loading..."}
                    </p>
                  </div>
                </div>
              </div>
              
              {pendingApproval.tier && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-purple-100">
                      <Award className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500">Coverage Tier</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {pendingApproval.tier.name}
                        {pendingApproval.tier.level && (
                          <span className="ml-1 text-xs text-slate-500">
                            (Level {pendingApproval.tier.level})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-100">
                    <Building className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500">Previous Facility</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {pendingApproval.original_facility_name || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100">
                    <Calendar className="h-5 w-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500">Request Date</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {pendingApproval.requested_at
                        ? new Date(pendingApproval.requested_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
              
              {pendingApproval.insurance_number && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500">Insurance Number</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {pendingApproval.insurance_number}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {pendingApproval.insurance_expiry && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500">Insurance Expiry</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {new Date(pendingApproval.insurance_expiry).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Request Notes (if any) */}
            {pendingApproval.request_notes && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FileText className="h-4 w-4" />
                  Transfer Request Notes
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {pendingApproval.request_notes}
                </p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => handleApproveTransfer(pendingApproval.id, pendingApproval)}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                Approve Transfer
              </button>
              
              <button
                onClick={() => handleRejectTransfer(pendingApproval.id, pendingApproval)}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-red-600 bg-white px-6 py-3 text-sm font-medium text-red-600 shadow-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                Reject (Patient Uninsured)
              </button>
            </div>
            
            <p className="mt-4 text-xs text-center text-slate-500">
              <Info className="inline h-3.5 w-3.5 mr-1" />
              Approve = Patient uses HMO at your facility | Reject = Patient uses standard catalog prices (uninsured)
            </p>
          </div>
        </div>
      )}

      {/* Main HMO Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="font-semibold text-slate-900">System HMO Enrollment</h3>
          {hasSystemHMO && !editing && (
            <div className="flex gap-2">
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleClearSystemHMO}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
                Clear HMO
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
        {editing ? (
          // Edit Mode
          <div className="space-y-6">
            {/* HMO Selection */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Building className="h-4 w-4" />
                Select HMO Plan *
              </label>
              <select
                value={selectedSystemHMO}
                onChange={(e) => handleSystemHMOChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={saving}
              >
                <option value="">-- Select an HMO --</option>
                {systemHMOs.map((hmo) => (
                  <option key={hmo.id} value={hmo.id}>
                    {hmo.name} {hmo.nhis_number && `(${hmo.nhis_number})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Tier Selection */}
            {selectedHMOTiers.length > 0 && (
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Award className="h-4 w-4" />
                  Coverage Tier *
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  disabled={saving}
                >
                  <option value="">-- Select tier --</option>
                  {selectedHMOTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} (Level {tier.level})
                      {tier.description && ` - ${tier.description}`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Higher tier levels typically provide better coverage and lower co-pays.
                </p>
              </div>
            )}

            {/* Insurance Number */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <CreditCard className="h-4 w-4" />
                Insurance/Card Number
              </label>
              <input
                type="text"
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                placeholder="e.g., INS-123456789"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={saving}
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional. The patient's insurance card or member number.
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

      {/* ========== APPROVAL HISTORY ========== */}
      {approvals && approvals.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">
                Transfer History
              </h3>
              <span className="ml-auto text-xs font-medium text-slate-500">
                {approvals.length} {approvals.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
          
          <div className="p-6 space-y-3">
            {approvals.map((approval) => {
              const isPending = approval.status === 'PENDING';
              const isApproved = approval.status === 'APPROVED';
              const isRejected = approval.status === 'REJECTED';
              
              return (
                <div
                  key={approval.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isPending
                      ? 'border-amber-200 bg-amber-50'
                      : isApproved
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          Transfer from {approval.original_facility_name || approval.original_provider_name || 'Unknown'}
                        </p>
                        
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isPending
                            ? 'bg-amber-200 text-amber-800'
                            : isApproved
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {approval.status_display || approval.status}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Requested: {new Date(approval.requested_at).toLocaleDateString()}
                        </span>
                        
                        {approval.decided_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Decided: {new Date(approval.decided_at).toLocaleDateString()}
                          </span>
                        )}
                        
                        {approval.decided_by_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            By: {approval.decided_by_name}
                          </span>
                        )}
                      </div>
                      
                      {approval.request_notes && (
                        <div className="mt-2 text-xs text-slate-600">
                          <span className="font-medium">Request notes:</span> {approval.request_notes}
                        </div>
                      )}
                      
                      {approval.decision_notes && (
                        <div className="mt-2 rounded-lg bg-white/60 px-3 py-2 text-xs">
                          <span className="font-medium text-slate-700">
                            {isApproved ? 'Approval' : 'Rejection'} notes:
                          </span>
                          <p className="mt-1 text-slate-600">{approval.decision_notes}</p>
                        </div>
                      )}
                    </div>
                    
                    {isPending && approval.id !== pendingApproval?.id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveTransfer(approval.id, approval)}
                          disabled={saving}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          title="Approve transfer"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRejectTransfer(approval.id, approval)}
                          disabled={saving}
                          className="rounded-lg border border-red-600 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Reject transfer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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