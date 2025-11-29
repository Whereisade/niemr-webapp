// app/patient/dependents/page.js
"use client";

import { useEffect, useState } from "react";
import { fetchDependents, createDependent } from "@/lib/dependents";

function formatName(dep) {
  const first = (dep.first_name || "").trim();
  const last = (dep.last_name || "").trim();
  const full = [first, last].filter(Boolean).join(" ");
  return full || dep.name || "—";
}

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

export default function PatientDependentsPage() {
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchDependents();
        if (cancelled) return;

        let items = [];
        if (Array.isArray(res?.results)) {
          items = res.results;
        } else if (Array.isArray(res)) {
          items = res;
        } else if (res && typeof res === "object") {
          const numericKeys = Object.keys(res).filter((k) =>
            /^\d+$/.test(k)
          );
          if (numericKeys.length) {
            items = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => res[k]);
          }
        }
        setDependents(items);
      } catch (err) {
        console.error("Failed to load dependents", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load your dependents. Please try again."
          );
          setDependents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName.trim() || !lastName.trim() || !dob || !gender) {
      setError(
        "Please fill in first name, last name, date of birth and gender."
      );
      return;
    }

    try {
      setCreating(true);

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        dob, // YYYY-MM-DD from <input type="date">
        gender,
        relationship: relationship.trim() || null,
      };

      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();

      const created = await createDependent(payload);

      // optimistic append
      setDependents((prev) => [created, ...prev]);
      setSuccess("Dependent added successfully.");

      // reset form
      setFirstName("");
      setLastName("");
      setDob("");
      setGender("");
      setRelationship("");
      setPhone("");
      setEmail("");
    } catch (err) {
      console.error("Failed to create dependent", err);

      // Try to show backend validation nicely if it's DRF style
      const detail =
        err?.detail ||
        (err?.data && JSON.stringify(err.data)) ||
        err?.message;

      setError(
        detail ||
          "Failed to create dependent. Please check the fields and try again."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          My dependents
        </h1>
        <p className="text-sm text-slate-600">
          Add children, parents, or other family members you manage care
          for. You’ll be able to book appointments and track their care
          from here.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Create form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Add a new dependent
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Basic information is required to create a dependent record.
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. David"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Adewale"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Date of birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Relationship
            </label>
            <input
              type="text"
              value={relationship}
              onChange={(e) => {
                setRelationship(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Son, Daughter, Mother"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="+2348012345678"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Adding…" : "Add dependent"}
            </button>
          </div>
        </form>
      </section>

      {/* Dependents list */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Saved dependents
        </h2>

        {loading && (
          <p className="mt-3 text-sm text-slate-500">
            Loading dependents…
          </p>
        )}

        {!loading && !dependents.length && (
          <p className="mt-3 text-sm text-slate-500">
            You haven&apos;t added any dependents yet.
          </p>
        )}

        {!loading && dependents.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date of birth
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gender
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Relationship
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dependents.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-800">
                      {formatName(dep)}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {formatDate(dep.dob || dep.date_of_birth)}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {dep.gender || "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {dep.relationship || dep.relation || "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {dep.phone || dep.phone_number || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
