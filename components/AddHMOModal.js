"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Shield,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function AddHMOModal({ isOpen, onClose, onSuccess, busy }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    nhis_number: "",
    addresses: [""],
    contact_numbers: [""],
    contact_person_name: "",
    contact_person_phone: "",
    contact_person_email: "",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleArrayAdd = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleArrayRemove = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleArrayChange = (field, index, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const validate = () => {
    const newErrors = {};

    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = "HMO name is required";
    }

    // NHIS number is required
    if (!formData.nhis_number.trim()) {
      newErrors.nhis_number = "NHIS number is required";
    }

    // At least one address required
    const validAddresses = formData.addresses.filter((a) => a.trim());
    if (validAddresses.length === 0) {
      newErrors.addresses = "At least one address is required";
    }

    // At least one contact number required
    const validNumbers = formData.contact_numbers.filter((n) => n.trim());
    if (validNumbers.length === 0) {
      newErrors.contact_numbers = "At least one contact number is required";
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Validate contact person email if provided
    if (
      formData.contact_person_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_person_email)
    ) {
      newErrors.contact_person_email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      // Clean up the data before sending
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        nhis_number: formData.nhis_number.trim(),
        addresses: formData.addresses.filter((a) => a.trim()).map((a) => a.trim()),
        contact_numbers: formData.contact_numbers.filter((n) => n.trim()).map((n) => n.trim()),
        contact_person_name: formData.contact_person_name.trim(),
        contact_person_phone: formData.contact_person_phone.trim(),
        contact_person_email: formData.contact_person_email.trim(),
        is_active: true,
      };

      const response = await fetch("/api/proxy/facilities/hmos/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle field-specific errors from backend
        if (typeof errorData === "object" && !errorData.detail) {
          setErrors(errorData);
          throw new Error("Please fix the errors in the form");
        }
        
        throw new Error(errorData.detail || `Failed to create HMO (${response.status})`);
      }

      const result = await response.json();
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        nhis_number: "",
        addresses: [""],
        contact_numbers: [""],
        contact_person_name: "",
        contact_person_phone: "",
        contact_person_email: "",
      });
      setErrors({});

      // Call success callback
      onSuccess?.();
      onClose();
    } catch (err) {
      // Show general error
      setErrors((prev) => ({
        ...prev,
        general: err.message || "Failed to create HMO",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setFormData({
      name: "",
      email: "",
      nhis_number: "",
      addresses: [""],
      contact_numbers: [""],
      contact_person_name: "",
      contact_person_phone: "",
      contact_person_email: "",
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">
              <Shield className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add New HMO</h2>
              <p className="text-xs text-slate-600">Register a new health insurance provider</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: "calc(90vh - 140px)" }}>
          {/* Basic Information */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Basic Information</h3>

            {/* Name */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Shield className="h-4 w-4 text-blue-600" />
                HMO Name
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., NHIS, Hygeia HMO, AXA Mansard"
                className={`w-full rounded-lg border ${
                  errors.name ? "border-rose-300" : "border-slate-200"
                } bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                disabled={submitting}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </div>

            {/* NHIS Number */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="h-4 w-4 text-blue-600" />
                NHIS Registration Number
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={formData.nhis_number}
                onChange={(e) => handleInputChange("nhis_number", e.target.value)}
                placeholder="e.g., NHIS/HMO/001/2024"
                className={`w-full rounded-lg border ${
                  errors.nhis_number ? "border-rose-300" : "border-slate-200"
                } bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                disabled={submitting}
              />
              {errors.nhis_number && (
                <p className="mt-1 text-xs text-rose-600">{errors.nhis_number}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-blue-600" />
                Primary Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="e.g., info@hygeiahmo.com"
                className={`w-full rounded-lg border ${
                  errors.email ? "border-rose-300" : "border-slate-200"
                } bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                disabled={submitting}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>
          </section>

          {/* Addresses */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-blue-600" />
                Office Addresses
                <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleArrayAdd("addresses")}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                Add Address
              </button>
            </div>

            {formData.addresses.map((address, index) => (
              <div key={index} className="flex items-start gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => handleArrayChange("addresses", index, e.target.value)}
                  placeholder={`Address ${index + 1}`}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={submitting}
                />
                {formData.addresses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleArrayRemove("addresses", index)}
                    disabled={submitting}
                    className="rounded-lg border border-rose-200 bg-white p-2.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {errors.addresses && (
              <p className="mt-1 text-xs text-rose-600">{errors.addresses}</p>
            )}
          </section>

          {/* Contact Numbers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Phone className="h-4 w-4 text-blue-600" />
                Contact Numbers
                <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleArrayAdd("contact_numbers")}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                Add Number
              </button>
            </div>

            {formData.contact_numbers.map((number, index) => (
              <div key={index} className="flex items-start gap-2">
                <input
                  type="tel"
                  value={number}
                  onChange={(e) => handleArrayChange("contact_numbers", index, e.target.value)}
                  placeholder={`Phone ${index + 1} (e.g., +234...)`}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  disabled={submitting}
                />
                {formData.contact_numbers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleArrayRemove("contact_numbers", index)}
                    disabled={submitting}
                    className="rounded-lg border border-rose-200 bg-white p-2.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {errors.contact_numbers && (
              <p className="mt-1 text-xs text-rose-600">{errors.contact_numbers}</p>
            )}
          </section>

          {/* Contact Person */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Contact Person (Optional)</h3>

            {/* Contact Person Name */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <User className="h-4 w-4 text-blue-600" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.contact_person_name}
                onChange={(e) => handleInputChange("contact_person_name", e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                disabled={submitting}
              />
            </div>

            {/* Contact Person Phone */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Phone className="h-4 w-4 text-blue-600" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.contact_person_phone}
                onChange={(e) => handleInputChange("contact_person_phone", e.target.value)}
                placeholder="e.g., +2348012345678"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                disabled={submitting}
              />
            </div>

            {/* Contact Person Email */}
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-blue-600" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.contact_person_email}
                onChange={(e) => handleInputChange("contact_person_email", e.target.value)}
                placeholder="e.g., john.doe@hygeiahmo.com"
                className={`w-full rounded-lg border ${
                  errors.contact_person_email ? "border-rose-300" : "border-slate-200"
                } bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
                disabled={submitting}
              />
              {errors.contact_person_email && (
                <p className="mt-1 text-xs text-rose-600">{errors.contact_person_email}</p>
              )}
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-60 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating HMO...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create HMO
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}