"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Shield,
  Loader2,
  AlertCircle,
  Search,
  Check,
  Building2,
  FileText,
  Calendar,
  MessageSquare,
  ChevronDown,
  Star,
  Users,
  Award,
} from "lucide-react";

/**
 * AddHMOModal - Enable a System HMO for a facility
 * 
 * With the new architecture:
 * - System HMOs are a master list managed by system admins
 * - Facilities "enable" HMOs from this list to work with them
 * - Each HMO has 3 tiers: Gold, Silver, Bronze (auto-created)
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - onSuccess: function (called after successful HMO enable)
 * - facilityId: number (optional, for nested routes)
 */
export default function AddHMOModal({ isOpen, onClose, onSuccess, facilityId }) {
  // Available HMOs from system list
  const [availableHMOs, setAvailableHMOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected HMO
  const [selectedHMO, setSelectedHMO] = useState(null);

  // Form data for relationship details
  const [formData, setFormData] = useState({
    relationship_status: "GOOD",
    relationship_notes: "",
    contract_start_date: "",
    contract_end_date: "",
    contract_reference: "",
  });

  // UI state
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Select HMO, 2: Set Details

  // Fetch available HMOs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableHMOs();
    }
  }, [isOpen]);

  const fetchAvailableHMOs = async () => {
    setLoading(true);
    setErrors({});

    try {
      // Use the facility HMO available endpoint
      const response = await fetch("/api/proxy/patients/hmo/facility/available/", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch available HMOs (${response.status})`);
      }

      const data = await response.json();
      setAvailableHMOs(data || []);
    } catch (err) {
      console.error("Error fetching available HMOs:", err);
      setErrors({ general: err.message || "Failed to load available HMOs" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter HMOs by search query
  const filteredHMOs = availableHMOs.filter(
    (hmo) =>
      hmo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hmo.nhis_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectHMO = (hmo) => {
    setSelectedHMO(hmo);
    setStep(2);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBack = () => {
    setStep(1);
    setSelectedHMO(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedHMO) {
      setErrors({ general: "Please select an HMO" });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const payload = {
        system_hmo_id: selectedHMO.id,
        relationship_status: formData.relationship_status || "GOOD",
        relationship_notes: formData.relationship_notes.trim(),
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        contract_reference: formData.contract_reference.trim(),
      };

      const response = await fetch("/api/proxy/patients/hmo/facility/enable/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (typeof errorData === "object" && !errorData.detail) {
          setErrors(errorData);
          throw new Error("Please fix the errors in the form");
        }

        throw new Error(
          errorData.detail || `Failed to enable HMO (${response.status})`
        );
      }

      // Reset state
      setSelectedHMO(null);
      setFormData({
        relationship_status: "GOOD",
        relationship_notes: "",
        contract_start_date: "",
        contract_end_date: "",
        contract_reference: "",
      });
      setStep(1);
      setSearchQuery("");
      setErrors({});

      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err.message || "Failed to enable HMO",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setSelectedHMO(null);
    setFormData({
      relationship_status: "GOOD",
      relationship_notes: "",
      contract_start_date: "",
      contract_end_date: "",
      contract_reference: "",
    });
    setStep(1);
    setSearchQuery("");
    setErrors({});
    onClose();
  };

  const relationshipStatusOptions = [
    { value: "EXCELLENT", label: "Excellent", color: "emerald" },
    { value: "GOOD", label: "Good", color: "blue" },
    { value: "FAIR", label: "Fair", color: "yellow" },
    { value: "POOR", label: "Poor", color: "orange" },
    { value: "BAD", label: "Bad", color: "red" },
  ];

  const getTierBadgeColor = (level) => {
    switch (level) {
      case 1:
        return "bg-amber-100 text-amber-700 border-amber-200"; // Gold
      case 2:
        return "bg-slate-100 text-slate-600 border-slate-200"; // Silver
      case 3:
        return "bg-orange-100 text-orange-700 border-orange-200"; // Bronze
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">
              <Shield className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {step === 1 ? "Enable HMO" : "Configure HMO Relationship"}
              </h2>
              <p className="text-xs text-slate-600">
                {step === 1
                  ? "Select an HMO from the system list to enable for your facility"
                  : `Setting up ${selectedHMO?.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              step === 1
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {step === 1 ? (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-[10px] text-white">
                1
              </span>
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Select HMO
          </div>
          <ChevronDown className="h-4 w-4 -rotate-90 text-slate-300" />
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              step === 2
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${
                step === 2 ? "bg-blue-600 text-white" : "bg-slate-300 text-white"
              }`}
            >
              2
            </span>
            Configure
          </div>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900">Error</p>
              <p className="mt-1 text-xs text-rose-800">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className="overflow-y-auto p-6"
          style={{ maxHeight: "calc(90vh - 220px)" }}
        >
          {step === 1 ? (
            // Step 1: Select HMO
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search HMOs by name or NHIS number..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="mt-2 text-sm text-slate-600">
                    Loading available HMOs...
                  </p>
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredHMOs.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100">
                    <Shield className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {searchQuery
                      ? "No HMOs match your search"
                      : "No HMOs available to enable"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {searchQuery
                      ? "Try a different search term"
                      : "All system HMOs have been enabled for your facility"}
                  </p>
                </div>
              )}

              {/* HMO List */}
              {!loading && filteredHMOs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    {filteredHMOs.length} HMO
                    {filteredHMOs.length !== 1 ? "s" : ""} available
                  </p>
                  <div className="space-y-2">
                    {filteredHMOs.map((hmo) => (
                      <button
                        key={hmo.id}
                        onClick={() => handleSelectHMO(hmo)}
                        className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">
                                {hmo.name}
                              </h3>
                            </div>
                            {hmo.nhis_number && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                NHIS: {hmo.nhis_number}
                              </p>
                            )}
                            {/* Tiers */}
                            {hmo.tiers && hmo.tiers.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {hmo.tiers.map((tier) => (
                                  <span
                                    key={tier.id}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTierBadgeColor(
                                      tier.level
                                    )}`}
                                  >
                                    {tier.level === 1 && (
                                      <Award className="h-2.5 w-2.5" />
                                    )}
                                    {tier.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-600">
                            <Plus className="h-5 w-5" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Step 2: Configure Relationship
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selected HMO Summary */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-100">
                    <Shield className="h-5 w-5 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-blue-900">
                      {selectedHMO?.name}
                    </h3>
                    {selectedHMO?.nhis_number && (
                      <p className="text-xs text-blue-700">
                        NHIS: {selectedHMO.nhis_number}
                      </p>
                    )}
                    {selectedHMO?.tiers && selectedHMO.tiers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedHMO.tiers.map((tier) => (
                          <span
                            key={tier.id}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getTierBadgeColor(
                              tier.level
                            )}`}
                          >
                            {tier.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Relationship Status */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Star className="h-4 w-4 text-blue-600" />
                  Relationship Status
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {relationshipStatusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        handleInputChange("relationship_status", option.value)
                      }
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        formData.relationship_status === option.value
                          ? `border-${option.color}-300 bg-${option.color}-100 text-${option.color}-700 ring-2 ring-${option.color}-200`
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                      style={{
                        backgroundColor:
                          formData.relationship_status === option.value
                            ? option.color === "emerald"
                              ? "#d1fae5"
                              : option.color === "blue"
                              ? "#dbeafe"
                              : option.color === "yellow"
                              ? "#fef3c7"
                              : option.color === "orange"
                              ? "#ffedd5"
                              : "#fee2e2"
                            : undefined,
                        color:
                          formData.relationship_status === option.value
                            ? option.color === "emerald"
                              ? "#047857"
                              : option.color === "blue"
                              ? "#1d4ed8"
                              : option.color === "yellow"
                              ? "#a16207"
                              : option.color === "orange"
                              ? "#c2410c"
                              : "#b91c1c"
                            : undefined,
                        borderColor:
                          formData.relationship_status === option.value
                            ? option.color === "emerald"
                              ? "#6ee7b7"
                              : option.color === "blue"
                              ? "#93c5fd"
                              : option.color === "yellow"
                              ? "#fcd34d"
                              : option.color === "orange"
                              ? "#fdba74"
                              : "#fca5a5"
                            : undefined,
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Relationship Notes */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  Relationship Notes (Optional)
                </label>
                <textarea
                  value={formData.relationship_notes}
                  onChange={(e) =>
                    handleInputChange("relationship_notes", e.target.value)
                  }
                  placeholder="Add notes about your relationship with this HMO (e.g., payment history, special terms, contact preferences)"
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={submitting}
                />
              </div>

              {/* Contract Details (Collapsible) */}
              <details className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Contract Details (Optional)
                  <ChevronDown className="ml-auto h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                  {/* Contract Reference */}
                  <div>
                    <label className="mb-1.5 text-sm font-medium text-slate-700">
                      Contract Reference
                    </label>
                    <input
                      type="text"
                      value={formData.contract_reference}
                      onChange={(e) =>
                        handleInputChange("contract_reference", e.target.value)
                      }
                      placeholder="e.g., CONTRACT-2024-001"
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      disabled={submitting}
                    />
                  </div>

                  {/* Contract Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.contract_start_date}
                        onChange={(e) =>
                          handleInputChange("contract_start_date", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formData.contract_end_date}
                        onChange={(e) =>
                          handleInputChange("contract_end_date", e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </details>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            {step === 2 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            {step === 2 && (
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting || !selectedHMO}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-60 disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enabling HMO...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Enable HMO
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}