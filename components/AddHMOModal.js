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
  Award,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Users,
} from "lucide-react";

/**
 * AddHMOModal - Enable a System HMO for a facility with facility-specific contact info
 * 
 * Flow:
 * 1. Search and select an HMO from system list (just the name)
 * 2. Input facility-specific contact information
 * 3. Configure relationship settings
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - onSuccess: function (called after successful HMO enable)
 */
export default function AddHMOModal({ isOpen, onClose, onSuccess }) {
  // Available HMOs from system list
  const [availableHMOs, setAvailableHMOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected HMO
  const [selectedHMO, setSelectedHMO] = useState(null);

  // Facility-specific contact information
  const [contactData, setContactData] = useState({
    email: "",
    addresses: [""],
    contact_numbers: [""],
    contact_person_name: "",
    contact_person_phone: "",
    contact_person_email: "",
  });

  // Relationship configuration
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
  const [step, setStep] = useState(1); // 1: Select HMO, 2: Contact Info & Relationship

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

  const handleContactChange = (field, value) => {
    setContactData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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

  // Address management
  const handleAddAddress = () => {
    setContactData((prev) => ({
      ...prev,
      addresses: [...prev.addresses, ""],
    }));
  };

  const handleRemoveAddress = (index) => {
    setContactData((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  const handleAddressChange = (index, value) => {
    setContactData((prev) => ({
      ...prev,
      addresses: prev.addresses.map((addr, i) => (i === index ? value : addr)),
    }));
  };

  // Contact number management
  const handleAddContactNumber = () => {
    setContactData((prev) => ({
      ...prev,
      contact_numbers: [...prev.contact_numbers, ""],
    }));
  };

  const handleRemoveContactNumber = (index) => {
    setContactData((prev) => ({
      ...prev,
      contact_numbers: prev.contact_numbers.filter((_, i) => i !== index),
    }));
  };

  const handleContactNumberChange = (index, value) => {
    setContactData((prev) => ({
      ...prev,
      contact_numbers: prev.contact_numbers.map((num, i) =>
        i === index ? value : num
      ),
    }));
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedHMO(null);
    }
  };

  const validateContactData = () => {
    const newErrors = {};

    if (!contactData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      newErrors.email = "Invalid email format";
    }

    const validAddresses = contactData.addresses.filter((a) => a.trim());
    if (validAddresses.length === 0) {
      newErrors.addresses = "At least one address is required";
    }

    const validNumbers = contactData.contact_numbers.filter((n) => n.trim());
    if (validNumbers.length === 0) {
      newErrors.contact_numbers = "At least one contact number is required";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate contact data
    const validationErrors = validateContactData();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      // Filter out empty entries
      const cleanedAddresses = contactData.addresses.filter((a) => a.trim());
      const cleanedNumbers = contactData.contact_numbers.filter((n) => n.trim());

      // Enable the HMO with facility-specific contact info
      const payload = {
        system_hmo_id: selectedHMO.id,
        is_active: true,
        relationship_status: formData.relationship_status,
        relationship_notes: formData.relationship_notes || '',
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        contract_reference: formData.contract_reference || '',
        // Facility-specific contact information
        email: contactData.email,
        addresses: cleanedAddresses,
        contact_numbers: cleanedNumbers,
        contact_person_name: contactData.contact_person_name || '',
        contact_person_phone: contactData.contact_person_phone || '',
        contact_person_email: contactData.contact_person_email || '',
      };

      const response = await fetch("/api/proxy/patients/hmo/facility/enable/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to enable HMO (${response.status})`);
      }

      const result = await response.json();
      
      // Success!
      if (onSuccess) onSuccess(result);
      handleClose();
    } catch (err) {
      console.error("Error enabling HMO:", err);
      setErrors({ general: err.message || "Failed to enable HMO" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedHMO(null);
    setContactData({
      email: "",
      addresses: [""],
      contact_numbers: [""],
      contact_person_name: "",
      contact_person_phone: "",
      contact_person_email: "",
    });
    setFormData({
      relationship_status: "GOOD",
      relationship_notes: "",
      contract_start_date: "",
      contract_end_date: "",
      contract_reference: "",
    });
    setErrors({});
    setSearchQuery("");
    onClose();
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case "GOLD":
        return "border-amber-300 bg-amber-100 text-amber-700";
      case "SILVER":
        return "border-slate-300 bg-slate-100 text-slate-700";
      case "BRONZE":
        return "border-orange-300 bg-orange-100 text-orange-700";
      default:
        return "border-slate-300 bg-slate-100 text-slate-700";
    }
  };

  const relationshipStatusOptions = [
    { label: "Excellent", value: "EXCELLENT", color: "emerald" },
    { label: "Good", value: "GOOD", color: "blue" },
    { label: "Average", value: "AVERAGE", color: "yellow" },
    { label: "Poor", value: "POOR", color: "orange" },
    { label: "Bad", value: "BAD", color: "red" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-sky-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5 shadow-lg shadow-blue-500/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {step === 1 ? "Select HMO" : "Enable HMO"}
              </h2>
              <p className="text-sm text-slate-600">
                {step === 1
                  ? "Choose an HMO from the system list"
                  : "Add your facility's contact information"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {step === 1 ? (
            /* STEP 1: Select HMO */
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search HMOs by name or NHIS number..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />
              </div>

              {/* HMO List */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading available HMOs...
                </div>
              ) : filteredHMOs.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
                  <Shield className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    {searchQuery ? "No HMOs found" : "No available HMOs"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {searchQuery
                      ? "Try a different search term"
                      : "All system HMOs are already enabled"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHMOs.map((hmo) => (
                    <button
                      key={hmo.id}
                      type="button"
                      onClick={() => handleSelectHMO(hmo)}
                      className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold text-slate-900">
                              {hmo.name}
                            </h3>
                          </div>
                          {hmo.nhis_number && (
                            <p className="mt-1 text-sm text-slate-600">
                              NHIS: {hmo.nhis_number}
                            </p>
                          )}
                          {hmo.description && (
                            <p className="mt-1 text-sm text-slate-500">
                              {hmo.description}
                            </p>
                          )}
                          {hmo.tiers && hmo.tiers.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {hmo.tiers.map((tier) => (
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
                        <Check className="h-5 w-5 text-blue-600 opacity-0 transition group-hover:opacity-100" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Contact Info & Relationship */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selected HMO Info */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Building2 className="h-5 w-5 text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900">
                      {selectedHMO.name}
                    </h3>
                    {selectedHMO.nhis_number && (
                      <p className="mt-0.5 text-sm text-blue-700">
                        NHIS: {selectedHMO.nhis_number}
                      </p>
                    )}
                    {selectedHMO.tiers && selectedHMO.tiers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
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

              {/* Facility-Specific Contact Information */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Users className="h-4 w-4 text-blue-600" />
                  Your Facility's Contact Information for this HMO
                </h3>

                {/* Email */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Mail className="h-4 w-4 text-blue-600" />
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactData.email}
                    onChange={(e) => handleContactChange("email", e.target.value)}
                    placeholder="contact@yourhospital.com"
                    className={`w-full rounded-lg border ${
                      errors.email ? "border-red-300" : "border-slate-200"
                    } bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                    disabled={submitting}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Addresses */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Address(es) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {contactData.addresses.map((address, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={address}
                          onChange={(e) =>
                            handleAddressChange(index, e.target.value)
                          }
                          placeholder="Enter address"
                          className={`flex-1 rounded-lg border ${
                            errors.addresses && !address.trim()
                              ? "border-red-300"
                              : "border-slate-200"
                          } bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                          disabled={submitting}
                        />
                        {contactData.addresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAddress(index)}
                            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                            disabled={submitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddAddress}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      disabled={submitting}
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Address
                    </button>
                  </div>
                  {errors.addresses && (
                    <p className="mt-1 text-xs text-red-600">{errors.addresses}</p>
                  )}
                </div>

                {/* Contact Numbers */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Phone className="h-4 w-4 text-blue-600" />
                    Contact Number(s) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {contactData.contact_numbers.map((number, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="tel"
                          value={number}
                          onChange={(e) =>
                            handleContactNumberChange(index, e.target.value)
                          }
                          placeholder="Enter phone number"
                          className={`flex-1 rounded-lg border ${
                            errors.contact_numbers && !number.trim()
                              ? "border-red-300"
                              : "border-slate-200"
                          } bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                          disabled={submitting}
                        />
                        {contactData.contact_numbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveContactNumber(index)}
                            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                            disabled={submitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddContactNumber}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      disabled={submitting}
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Number
                    </button>
                  </div>
                  {errors.contact_numbers && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.contact_numbers}
                    </p>
                  )}
                </div>

                {/* Contact Person (Optional) */}
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-700">
                    <Users className="h-4 w-4 text-blue-600" />
                    Contact Person Details (Optional)
                    <ChevronDown className="ml-auto h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="mb-1.5 text-sm font-medium text-slate-700">
                        Name
                      </label>
                      <input
                        type="text"
                        value={contactData.contact_person_name}
                        onChange={(e) =>
                          handleContactChange("contact_person_name", e.target.value)
                        }
                        placeholder="e.g., John Doe"
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 text-sm font-medium text-slate-700">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={contactData.contact_person_phone}
                        onChange={(e) =>
                          handleContactChange("contact_person_phone", e.target.value)
                        }
                        placeholder="e.g., +234 xxx xxxx xxx"
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 text-sm font-medium text-slate-700">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contactData.contact_person_email}
                        onChange={(e) =>
                          handleContactChange("contact_person_email", e.target.value)
                        }
                        placeholder="e.g., john.doe@hmo.com"
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </details>
              </div>

              {/* Relationship Configuration */}
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Star className="h-4 w-4 text-blue-600" />
                  Relationship Configuration
                </h3>

                {/* Relationship Status */}
                <div>
                  <label className="mb-2 text-sm font-medium text-slate-700">
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
                    placeholder="Add notes about your relationship with this HMO"
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    disabled={submitting}
                  />
                </div>

                {/* Contract Details (Collapsible) */}
                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-700">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Contract Details (Optional)
                    <ChevronDown className="ml-auto h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-3">
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
                    <div className="grid grid-cols-2 gap-3">
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
              </div>
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
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-60 disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enabling...
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