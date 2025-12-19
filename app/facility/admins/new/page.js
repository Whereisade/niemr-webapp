// app/facility/admins/new/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  UserPlus,
  Shield,
  ShieldCheck,
  UserCog,
  Mail,
  Lock,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";

const STAFF_ROLES = [
  {
    value: "ADMIN",
    label: "Admin",
    description:
      "Full access to facility management, settings, and administrative functions.",
    icon: Shield,
    color: "blue",
  },
  {
    value: "FRONTDESK",
    label: "Front Desk",
    description:
      "Manage appointments, patient check-ins, and basic reception tasks.",
    icon: UserCog,
    color: "amber",
  },
];

export default function CreateFacilityStaffPage() {
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
    role: "ADMIN",
    phone: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  function handleRoleSelect(role) {
    setFormData((prev) => ({ ...prev, role }));
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
        role: formData.role,
      };

      // Optional fields
      if (formData.phone) {
        payload.phone = formData.phone.trim();
      }

      await apiFetch("/accounts/facility-staff/create/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(true);

      // Redirect after short delay
      setTimeout(() => {
        router.push("/facility/admins");
      }, 2000);
    } catch (err) {
      console.error("Failed to create staff", err);

      // Try to parse field-specific errors
      const msg = err?.message || "Failed to create staff member";
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

  const selectedRole = STAFF_ROLES.find((r) => r.value === formData.role);

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <div className="rounded-3xl border border-purple-100 bg-white p-10 text-center shadow-xl shadow-purple-100/20">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shadow-lg shadow-purple-200">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Staff Account Created
            </h1>
            <p className="mt-3 text-slate-600">
              The {selectedRole?.label || "staff"} account has been created and
              is now linked to your facility. They can log in immediately using
              the credentials you provided.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/facility/admins"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
              >
                View All Staff
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
                    role: "ADMIN",
                    phone: "",
                  });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                Add Another
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      {/* Decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/facility/admins"
            className="group mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            Back to Staff
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Add New Staff
              </h1>
              <p className="mt-1 text-slate-600">
                Create a new admin or front desk account for your facility.
              </p>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error creating staff</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Role Selection */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-100/50">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <Shield className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Select Role</h2>
                <p className="text-sm text-slate-500">
                  Choose the access level for this staff member
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {STAFF_ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = formData.role === role.value;
                const colorClasses = {
                  blue: {
                    selected:
                      "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20",
                    icon: "bg-blue-100 text-blue-700",
                    badge: "bg-blue-600",
                  },
                  amber: {
                    selected:
                      "border-amber-500 bg-amber-50 ring-2 ring-amber-500/20",
                    icon: "bg-amber-100 text-amber-700",
                    badge: "bg-amber-600",
                  },
                };
                const colors = colorClasses[role.color];

                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleSelect(role.value)}
                    className={`relative flex flex-col items-start rounded-2xl border p-5 text-left transition ${
                      isSelected
                        ? colors.selected
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected && (
                      <div
                        className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full ${colors.badge}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isSelected ? colors.icon : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3">
                      <p className="font-semibold text-slate-900">
                        {role.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {role.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Account Information */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-100/50">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Lock className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Account Credentials
                </h2>
                <p className="text-sm text-slate-500">
                  Login details for the new staff member
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
                    placeholder="staff@example.com"
                    className={`w-full rounded-xl border ${
                      fieldErrors.email
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    } py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10`}
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
                    } py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10`}
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
                    } py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10`}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <User className="h-5 w-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Personal Information
                </h2>
                <p className="text-sm text-slate-500">
                  Basic details about the staff member
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
                  placeholder="Jane"
                  className={`w-full rounded-xl border ${
                    fieldErrors.first_name
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 bg-slate-50"
                  } px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10`}
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
                  } px-4 py-3 text-slate-900 placeholder:text-slate-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10`}
                />
                {fieldErrors.last_name && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.last_name}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone Number{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+234 801 234 5678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/facility/admins"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-200 transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Staff…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Staff Account
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security note */}
        <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <AlertCircle className="h-4 w-4 text-amber-700" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-amber-900">Security Note</p>
              <p className="mt-1 text-amber-700">
                Make sure to share the login credentials securely with the new
                staff member. Consider asking them to change their password
                after their first login.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}