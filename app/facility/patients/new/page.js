// app/facility/patients/new/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPatient } from "@/lib/patientsActions";
import { apiFetch } from "@/lib/api";
import {
  UserPlus,
  Building2,
  Loader2,
  Mail,
  Phone,
  Calendar,
  UserRound,
  ArrowLeft,
} from "lucide-react";

export default function FacilityNewPatientPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  const [facilityId, setFacilityId] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load /accounts/me/ to get facility id
  useEffect(() => {
    let cancelled = false;

    async function fetchMe() {
      try {
        setLoadingMe(true);
        const me = await apiFetch("/accounts/me/");
        if (cancelled) return;

        const fac = me?.facility;
        if (fac && typeof fac === "object" && fac.id) {
          setFacilityId(fac.id);
        } else if (typeof fac === "number") {
          setFacilityId(fac);
        } else {
          setFacilityId(null);
        }
      } catch (err) {
        console.error("Failed to load /accounts/me/ for facility", err);
        setFacilityId(null);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }

    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    };

    if (email.trim()) payload.email = email.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (dob) payload.dob = dob;
    if (gender) payload.gender = gender;

    if (facilityId) {
      payload.facility = facilityId;
    }

    setIsSubmitting(true);
    try {
      await createPatient(payload);
      router.push("/facility/patients");
    } catch (err) {
      console.error("Create patient failed", err);
      setError(
        err?.message ||
          "Failed to create patient. Please check the fields and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitDisabled = isSubmitting || loadingMe;

  const hasFacility = Boolean(facilityId);

  return (
    <main className="relative mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      {/* soft background accents */}
      <div className="pointer-events-none absolute -top-28 -left-32 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-32 h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl" />

      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push("/facility/patients")}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to patients
      </button>

      {/* Header */}
      <header className="relative space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <UserPlus className="h-3.5 w-3.5" />
          New facility patient
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Register a new patient
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Capture core demographic details to create a patient record for this
            facility.
          </p>
        </div>

        {/* <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">
            <UserRound className="h-3 w-3" />
            Required: name
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            <Mail className="h-3 w-3" />
            Optional: contact details
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
            <Calendar className="h-3 w-3" />
            Optional: DOB & gender
          </span>
        </div> */}

        {/* Facility badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            {loadingMe ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                Loading facility details…
              </>
            ) : hasFacility ? (
              "Facility will be linked automatically."
            ) : (
              "No facility found on your profile · patient will still be created."
            )}
          </span>
        </div>
      </header>

      {/* Form */}
      <section className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* accent bar */}
        <div className="-mx-6 -mt-6 mb-4 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-t-2xl" />

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                First name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. David"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Last name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Adewale"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email (optional)
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="flex-1 border-none bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone (optional)
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <Phone className="h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234…"
                  className="flex-1 border-none bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Date of birth 
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="flex-1 border-none bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select…</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/facility/patients")}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitDisabled}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting || loadingMe ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create patient
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
