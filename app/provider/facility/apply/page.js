"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

function normalizeFacilitiesPayload(body) {
  if (!body) return [];

  // DRF paginated: { count, results: [...] }
  if (Array.isArray(body?.results)) {
    return body.results;
  }

  // Plain list: [...]
  if (Array.isArray(body)) {
    return body;
  }

  // Weird numeric-key object
  if (body && typeof body === "object") {
    const numericKeys = Object.keys(body).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }

  return [];
}

export default function ProviderApplyToFacilityPage() {
  const router = useRouter();

  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState("");

  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Load active facilities once
  useEffect(() => {
    let cancelled = false;

    async function loadFacilities() {
      try {
        setFacilitiesLoading(true);
        setFacilitiesError("");

        const body = await apiFetch("/facilities/?is_active=true", {
          method: "GET",
        });

        if (cancelled) return;

        const items = normalizeFacilitiesPayload(body);
        setFacilities(items);
      } catch (err) {
        console.error("Failed to load facilities for provider apply page", err);
        if (!cancelled) {
          setFacilitiesError(
            err?.message || "Could not load facilities. Please try again."
          );
          setFacilities([]);
        }
      } finally {
        if (!cancelled) {
          setFacilitiesLoading(false);
        }
      }
    }

    loadFacilities();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedFacilityId) return;

    try {
      setSubmitting(true);
      setSubmitError("");
      setSubmitSuccess("");

      await apiFetch("/providers/apply-to-facility/", {
        method: "POST",
        body: JSON.stringify({
          facility_id: Number(selectedFacilityId),
          message,
        }),
      });

      setSubmitSuccess("Your application has been submitted to the facility.");
      // Optionally clear the note, but keep the selected facility
      setMessage("");
    } catch (err) {
      console.error("Apply to facility failed", err);
      setSubmitError(
        err?.message ||
          "Failed to submit application. Please check your details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6 md:p-10">
      <header className="space-y-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <span>← Back</span>
        </button>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          Apply to a facility
        </h1>
        <p className="text-sm text-slate-600">
          Choose a facility you would like to work under. An administrator at
          that facility will review and approve or decline your application.
        </p>
      </header>

      {facilitiesError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {facilitiesError}
        </div>
      )}

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {submitSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {submitSuccess}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">
          Join a facility
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Select a facility and optionally add a note to the admin about your
          experience or the role you&apos;re interested in.
        </p>

        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 mb-0.5">
              Facility
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              disabled={facilitiesLoading || submitting}
            >
              <option value="">Select a facility…</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {facilitiesLoading && (
              <p className="text-[11px] text-slate-500">Loading facilities…</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 mb-0.5">
              Message to facility admin (optional)
            </label>
            <textarea
              className="h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="E.g. Years of experience, specialties, preferred schedule..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={!selectedFacilityId || submitting || facilitiesLoading}
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
