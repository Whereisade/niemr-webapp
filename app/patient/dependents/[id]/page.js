// app/patient/dependents/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, User, Calendar, Phone, Heart, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

// Import existing patient components
import PatientVitalsHistory from "@/components/patient/PatientVitalsHistory";
import PatientAllergies from "@/components/patient/Patientallergies";
import PatientDocumentsProvider from "@/components/patient/PatientDocumentsProvider";
import PatientDocumentUploadProvider from "@/components/patient/PatientDocumentUploadProvider";

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

function calculateAge(dob) {
  if (!dob) return "—";
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch {
    return "—";
  }
}

export default function DependentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const dependentId = params?.id;

  const [dependent, setDependent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dependentId) return;

    async function loadDependent() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch(`/patients/dependents/${dependentId}/`);
        setDependent(data);
      } catch (err) {
        console.error("Failed to load dependent", err);
        setError(
          err?.message || "Failed to load dependent profile. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDependent();
  }, [dependentId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading dependent profile…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
        <button
          onClick={() => router.push("/patient/dependents")}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dependents
        </button>
      </div>
    );
  }

  if (!dependent) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Dependent not found.
        </div>
        <button
          onClick={() => router.push("/patient/dependents")}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dependents
        </button>
      </div>
    );
  }

  const fullName = `${dependent.first_name || ""} ${dependent.last_name || ""}`.trim();
  const age = calculateAge(dependent.dob);

  return (
    <main className="relative mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

      {/* Back button */}
      <div className="relative">
        <button
          onClick={() => router.push("/patient/dependents")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dependents
        </button>
      </div>

      {/* Header */}
      <header className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <User className="h-3.5 w-3.5" />
          Dependent Profile
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View health records, vitals, allergies, and documents for your dependent.
          </p>
        </div>
      </header>

      {/* Patient Info Card */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Name */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Full Name
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {fullName}
                </p>
              </div>
            </div>

            {/* Date of Birth / Age */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Date of Birth
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(dependent.dob)}
                </p>
                <p className="text-xs text-slate-500">Age: {age} years</p>
              </div>
            </div>

            {/* Gender */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                <User className="h-5 w-5 text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Gender
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {dependent.gender || "—"}
                </p>
              </div>
            </div>

            {/* Relationship */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50">
                <Heart className="h-5 w-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Relationship
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {dependent.relationship || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Phone if available */}
          {dependent.phone && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Phone className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Phone Number
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {dependent.phone}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Health Information Grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left Column: Allergies + Vitals History */}
        <div className="space-y-6">
          {/* Allergies */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
            <div className="p-4">
              <PatientAllergies patientId={dependentId} />
            </div>
          </section>

          {/* Vitals History */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600" />
            <div className="p-4">
              <PatientVitalsHistory patientId={dependentId} />
            </div>
          </section>
        </div>

        {/* Right Column: Documents */}
        <div className="space-y-6">
          {/* View Documents */}
          <PatientDocumentsProvider patientId={dependentId} />

          {/* Upload Documents */}
          <PatientDocumentUploadProvider
            patientId={dependentId}
            onUploadSuccess={() => {
              // Optionally refresh documents list
              window.location.reload();
            }}
          />
        </div>
      </div>
    </main>
  );
}