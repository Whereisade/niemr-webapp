// app/facility/providers/new/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  UserPlus,
  Stethoscope,
  Shield,
  Mail,
  Lock,
  User,
  Phone,
  FileText,
  Calendar,
  Briefcase,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  X,
} from "lucide-react";

const PROVIDER_TYPES = [
  { value: "DOCTOR", label: "Medical Doctor", icon: "🩺" },
  { value: "NURSE", label: "Nurse", icon: "👩‍⚕️" },
  { value: "LAB_SCIENTIST", label: "Medical Lab Scientist", icon: "🔬" },
  { value: "PHARMACIST", label: "Pharmacist", icon: "💊" },
  { value: "DENTIST", label: "Dentist", icon: "🦷" },
  { value: "OPTOMETRIST", label: "Optometrist", icon: "👁️" },
  { value: "PHYSIOTHERAPIST", label: "Physiotherapist", icon: "🏃" },
  { value: "OTHER", label: "Other", icon: "⚕️" },
];

const LICENSE_COUNCILS = [
  { value: "MDCN", label: "Medical & Dental Council of Nigeria (MDCN)" },
  { value: "NMCN", label: "Nursing & Midwifery Council of Nigeria (NMCN)" },
  { value: "PCN", label: "Pharmacists Council of Nigeria (PCN)" },
  { value: "MLSCN", label: "Medical Lab Science Council of Nigeria (MLSCN)" },
  { value: "RADI", label: "Radiographers Registration Board of Nigeria" },
  { value: "OTHER", label: "Other" },
];

export default function CreateFacilityProviderPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    provider_type: "DOCTOR",
    license_council: "MDCN",
    license_number: "",
    license_expiry: "",
    phone: "",
    years_experience: "",
    bio: "",
    consultation_fee: "",
  });

  // Specialties as tags
  const [specialties, setSpecialties] = useState([]);
  const [specialtyInput, setSpecialtyInput] = useState("");

  // Available specialties from API
  const [availableSpecialties, setAvailableSpecialties] = useState([]);

  useEffect(() => {
    async function loadSpecialties() {
      try {
        const res = await apiFetch("/facilities/specialties/");
        const items = Array.isArray(res) ? res : res?.results || [];
        setAvailableSpecialties(items.map((s) => s.name));
      } catch (err) {
        console.error("Failed to load specialties", err);
      }
    }
    loadSpecialties();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  function handleAddSpecialty(e) {
    e.preventDefault();
    const val = specialtyInput.trim();
    if (val && !specialties.includes(val)) {
      setSpecialties((prev) => [...prev, val]);
    }
    setSpecialtyInput("");
  }

  function handleRemoveSpecialty(name) {
    setSpecialties((prev) => prev.filter((s) => s !== name));
  }

  function handleSelectSpecialty(name) {
    if (!specialties.includes(name)) {
      setSpecialties((prev) => [...prev, name]);
    }
    setSpecialtyInput("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSuccess(false);

    // Client-side validation
    const errors = {};

    if (!formData.email) errors.email = "Email is required";
    if (!formData.password) errors.password = "Password is required";
    if (formData.password.length < 8)
      errors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (!formData.first_name) errors.first_name = "First name is required";
    if (!formData.last_name) errors.last_name = "Last name is required";
    if (!formData.license_number)
      errors.license_number = "License number is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        provider_type: formData.provider_type,
        license_council: formData.license_council,
        license_number: formData.license_number.trim(),
        specialties: specialties,
      };

      // Optional fields
      if (formData.license_expiry) {
        payload.license_expiry = formData.license_expiry;
      }
      if (formData.phone) {
        payload.phone = formData.phone.trim();
      }
      if (formData.years_experience) {
        payload.years_experience = parseInt(formData.years_experience, 10);
      }
      if (formData.bio) {
        payload.bio = formData.bio.trim();
      }
      if (formData.consultation_fee) {
        payload.consultation_fee = parseFloat(formData.consultation_fee);
      }

      await apiFetch("/providers/facility-create/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(true);

      // Redirect after short delay
      setTimeout(() => {
        router.push("/facility/providers");
      }, 2000);
    } catch (err) {
      console.error("Failed to create provider", err);

      // Try to parse field-specific errors
      const msg = err?.message || "Failed to create provider";
      if (msg.includes("email")) {
        setFieldErrors({ email: msg });
      } else if (msg.includes("password")) {
        setFieldErrors({ password: msg });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredSuggestions = availableSpecialties.filter(
    (s) =>
      s.toLowerCase().includes(specialtyInput.toLowerCase()) &&
      !specialties.includes(s)
  );

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <div className="rounded-3xl border border-emerald-100 bg-white p-10 text-center shadow-xl shadow-emerald-100/20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Provider Created Successfully
            </h1>
            <p className="mt-3 text-slate-600">
              The provider account has been created and is now linked to your
              facility. They can log in immediately using the credentials you
              provided.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/facility/providers"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
              >
                View All Providers
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    email: "",
                    password: "",
                    confirmPassword: "",
                    first_name: "",
                    last_name: "",
                    provider_type: "DOCTOR",
                    license_council: "MDCN",
                    license_number: "",
                    license_expiry: "",
                    phone: "",
                    years_experience: "",
                    bio: "",
                    consultation_fee: "",
                  });
                  setSpecialties([]);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                Add Another Provider
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/facility/providers"
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            Back to Providers
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
              <UserPlus className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Add New Provider
              </h1>
              <p className="mt-1 text-slate-600">
                Create a new staff account for your facility. The provider will
                be automatically approved and linked.
              </p>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error creating provider</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Account Information */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-100/50">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Shield className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Account Credentials
                </h2>
                <p className="text-sm text-slate-500">
                  Login details for the new provider
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="doctor@example.com"
                    className={`w-full rounded-xl border ${
                      fieldErrors.email
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    } py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 characters"
                    className={`w-full rounded-xl border ${
                      fieldErrors.password
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    } py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className={`w-full rounded-xl border ${
                      fieldErrors.confirmPassword
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    } py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10`}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Personal Information */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-100/50">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <User className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Personal Information
                </h2>
                <p className="text-sm text-slate-500">
                  Basic details about the provider
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  className={`w-full rounded-xl border ${
                    fieldErrors.first_name
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-slate-50"
                  } px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10`}
                />
                {fieldErrors.first_name && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.first_name}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  className={`w-full rounded-xl border ${
                    fieldErrors.last_name
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-slate-50"
                  } px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10`}
                />
                {fieldErrors.last_name && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.last_name}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+234 801 234 5678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Professional Information */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-100/50">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <Stethoscope className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Professional Details
                </h2>
                <p className="text-sm text-slate-500">
                  License and specialization information
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Provider Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="provider_type"
                  value={formData.provider_type}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  {PROVIDER_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.icon} {pt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  License Council <span className="text-red-500">*</span>
                </label>
                <select
                  name="license_council"
                  value={formData.license_council}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  {LICENSE_COUNCILS.map((lc) => (
                    <option key={lc.value} value={lc.value}>
                      {lc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  License Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleChange}
                    placeholder="e.g. MDCN/12345"
                    className={`w-full rounded-xl border ${
                      fieldErrors.license_number
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    } py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10`}
                  />
                </div>
                {fieldErrors.license_number && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.license_number}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  License Expiry Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    name="license_expiry"
                    value={formData.license_expiry}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Years of Experience
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    name="years_experience"
                    value={formData.years_experience}
                    onChange={handleChange}
                    min="0"
                    placeholder="5"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Consultation Fee (₦)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    name="consultation_fee"
                    value={formData.consultation_fee}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="5000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div> */}

              {/* Specialties */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Specialties
                </label>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {specialties.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecialty(s)}
                          className="ml-1 rounded-full p-0.5 hover:bg-blue-200 transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={specialtyInput}
                      onChange={(e) => setSpecialtyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddSpecialty(e);
                        }
                      }}
                      placeholder="Type specialty and press Enter…"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                    {specialtyInput && filteredSuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                        {filteredSuggestions.slice(0, 8).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleSelectSpecialty(s)}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition first:rounded-t-xl last:rounded-b-xl"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Bio / Description
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Brief professional background and areas of expertise…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/facility/providers"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Provider…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Provider
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}