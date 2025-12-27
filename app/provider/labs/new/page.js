"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { createLabOrder } from "@/lib/labsActions";

const PRIORITY_OPTIONS = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "STAT", label: "Stat" },
];

export default function ProviderNewLabOrderPage() {
  const router = useRouter();

  // Independent LAB users shouldn't create lab orders (they receive/fulfil them).
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  const [patientId, setPatientId] = useState("");
  const [externalLabName, setExternalLabName] = useState("");
  const [outsourcedTo, setOutsourcedTo] = useState("");
  const [externalLabs, setExternalLabs] = useState([]);
  const [loadingLabs, setLoadingLabs] = useState(true);
  const [labsError, setLabsError] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await apiFetch("/accounts/me/", { method: "GET" });
        if (!cancelled) setMe(res);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const meRole = String(me?.role || "").toUpperCase();

  // LAB users fulfil lab orders; they don't create them.
  if (!meLoading && meRole === "LAB") {
    return (
      <main className="mx-auto max-w-3xl p-6 md:p-10">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            New lab order
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Lab scientists don’t create lab orders. You’ll see orders assigned to you in your lab inbox.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            Go to <span className="font-medium">Lab Orders</span> to collect samples and enter results.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/provider/labs")}
              className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Go to Lab Orders
            </button>
            <button
              type="button"
              onClick={() => router.push("/provider")}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      try {
        setLoadingPatients(true);
        const res = await apiFetch("/patients/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setPatients(items);
      } catch (err) {
        console.error("Failed to load patients", err);
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    }

    fetchPatients();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchExternalLabs() {
      setLoadingLabs(true);
      setLabsError("");

      try {
        // Backend uses role name LAB for the user, but provider_type for filtering
        // We keep facility=none (independent providers) and ask for lab scientists.
        const data = await apiFetch("/providers/?facility=none&type=LAB_SCIENTIST");
        const list =
          Array.isArray(data)
            ? data
            : Array.isArray(data?.results)
              ? data.results
              : data && typeof data === "object"
                ? Object.values(data)
                : [];

        if (!cancelled) setExternalLabs(list);
      } catch (e) {
        if (!cancelled) setLabsError(e?.message || "Failed to load external labs.");
      } finally {
        if (!cancelled) setLoadingLabs(false);
      }
    }

    fetchExternalLabs();

    return () => {
      cancelled = true;
    };
  }, []);


  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const patient = Number(patientId);
    if (!patient || Number.isNaN(patient)) {
      setError(
        !loadingPatients && patients.length === 0
          ? "No patients are available. Create a patient profile first."
          : "Please select a patient."
      );
      return;
    }

    if (!externalLabName.trim()) {
      setError("Please enter the external lab name.");
      return;
    }

    if (!notes.trim()) {
      setError("Please describe the tests requested (and clinical context).");
      return;
    }

    const isOtherLab = outsourcedTo === "__other__";
    const resolvedOutsourcedTo =
      outsourcedTo && !isOtherLab ? Number(outsourcedTo) : null;

    const resolvedExternalName = externalLabName.trim();

    if (!resolvedExternalName) {
      setError("Please select an external lab (or choose Other and enter a name).");
      return;
    }

    const payload = {
      patient,
      priority: priority || "ROUTINE",
      outsourced_to: resolvedOutsourcedTo,
      external_lab_name: resolvedExternalName,
      note: notes.trim(),
    };

    setIsSubmitting(true);
    try {
      await createLabOrder(payload);
      router.push("/provider/labs");
    } catch (err) {
      console.error("Create lab order failed", err);
      setError(err?.message || "Failed to create lab order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If current user is an independent LAB, this page isn't applicable.
  if (!meLoading && meRole === "LAB") {
    return (
      <main className="mx-auto max-w-3xl p-6 md:p-10">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            New lab order
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Lab scientists don&apos;t create lab orders — you receive orders from
            clinicians and enter results.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            Go to your lab orders list to open an order and enter results.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/provider/labs")}
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              View lab orders
            </button>
            <button
              type="button"
              onClick={() => router.push("/provider/labs/catalog")}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Manage catalog
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          New lab order
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Independent providers outsource lab requests to external labs.
        </p>
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Patient
          </label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">
              {loadingPatients
                ? "Loading patients…"
                : patients.length
                ? "Select patient"
                : "No patients found"}
            </option>
            {!loadingPatients &&
              patients.map((p) => {
                const fullName = [p.first_name, p.last_name]
                  .filter(Boolean)
                  .join(" ");
                const label = fullName || p.email || `Patient #${p.id}`;
                return (
                  <option key={p.id} value={String(p.id)}>
                    {label}
                  </option>
                );
              })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            External lab
          </label>

          <select
            value={outsourcedTo}
            onChange={(e) => {
              const v = e.target.value;
              setOutsourcedTo(v);

              if (!v || v === "__other__") {
                setExternalLabName("");
                return;
              }

              const selected = externalLabs.find(
                (lab) => String(lab?.user ?? lab?.user_id ?? "") === String(v)
              );

              const label =
                selected?.full_name ||
                selected?.user_name ||
                selected?.user_email ||
                selected?.email ||
                "External lab";

              setExternalLabName(label);
            }}
            disabled={loadingLabs}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
          >
            <option value="">{loadingLabs ? "Loading labs..." : "Select external lab"}</option>
            {externalLabs.map((lab) => {
              const value = String(lab?.user ?? lab?.user_id ?? "");
              const label =
                lab?.full_name ||
                lab?.user_name ||
                lab?.user_email ||
                lab?.email ||
                value ||
                "External lab";

              return (
                <option key={value || label} value={value}>
                  {label}
                </option>
              );
            })}
            <option value="__other__">Other (enter name)</option>
          </select>

          {outsourcedTo === "__other__" ? (
            <input
              type="text"
              value={externalLabName}
              onChange={(e) => setExternalLabName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Enter external lab name"
            />
          ) : null}

          {labsError ? (
            <p className="mt-2 text-xs text-red-600">{labsError}</p>
          ) : null}

          <p className="mt-1 text-xs text-slate-500">
            Choose an independent lab scientist from the dropdown (or select Other).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tests requested + clinical note
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Example: FBC + U&E. Patient has fatigue and dizziness; rule out anemia/electrolyte imbalance."
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/provider/labs")}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Create lab order"}
          </button>
        </div>
      </form>
    </main>
  );
}
