// app/facility/patients/new/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPatient } from "@/lib/patientsActions";
import { apiFetch } from "@/lib/api";

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
          // no facility on the account — backend may still accept patient without it
          setFacilityId(null);
        }
      } catch (err) {
        console.error("Failed to load /accounts/me/ for facility", err);
        // we won't block on this — we just won't send facility in payload
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

    // Attach facility if we have it (most likely required by backend)
    if (facilityId) {
      payload.facility = facilityId;
    }

    setIsSubmitting(true);
    try {
      await createPatient(payload);
      // After creating, go back to facility patient list
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

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          New patient
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Register a new patient into this facility.
        </p>
        {loadingMe && (
          <p className="mt-1 text-xs text-slate-500">
            Loading facility details…
          </p>
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date of birth (optional)
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Gender (optional)
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
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitDisabled}
            className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Create patient"}
          </button>
        </div>
      </form>
    </main>
  );
}
