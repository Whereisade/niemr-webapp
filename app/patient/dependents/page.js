// app/patient/dependents/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Baby, Loader2, ChevronRight } from "lucide-react";
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
  const router = useRouter();
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
          const numericKeys = Object.keys(res).filter((k) => /^\d+$/.test(k));
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
        dob,
        gender,
        relationship: relationship.trim() || null,
      };

      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();

      const created = await createDependent(payload);

      setDependents((prev) => [created, ...prev]);
      setSuccess("Dependent added successfully.");

      setFirstName("");
      setLastName("");
      setDob("");
      setGender("");
      setRelationship("");
      setPhone("");
      setEmail("");
    } catch (err) {
      console.error("Failed to create dependent", err);

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

  function handleRowClick(dependentId) {
    router.push(`/patient/dependents/${dependentId}`);
  }

  const total = dependents.length;
  const minors = dependents.filter((d) => {
    const date = d.dob || d.date_of_birth;
    if (!date) return false;
    const dobDate = new Date(date);
    if (Number.isNaN(dobDate.getTime())) return false;
    const ageMs = Date.now() - dobDate.getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    return ageYears < 18;
  }).length;

  return (
    <main className="relative mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* soft background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          <Users className="h-3.5 w-3.5" />
          Dependents
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            My dependents
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Add children, parents, or other family members you manage care for.
            You'll be able to book appointments and track their care from here.
          </p>
        </div>
      </header>

      {/* Quick stats */}
      <section className="relative grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Total dependents
            </p>
            <p className="text-lg font-semibold text-slate-900">{total}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
            <Baby className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Under 18
            </p>
            <p className="text-lg font-semibold text-slate-900">{minors}</p>
          </div>
        </div>

        <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-700 shadow-sm sm:flex">
          <UserPlus className="h-4 w-4 text-slate-500" />
          <p>
            Add a dependent below and start booking appointments on their
            behalf.
          </p>
        </div>
      </section>

      {error && (
        <div className="relative rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="relative rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Create form */}
      <section className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Add a new dependent
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Basic information is required to create a dependent record.
            </p>
          </div>
          <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-blue-50 sm:flex">
            <UserPlus className="h-4 w-4 text-blue-600" />
          </div>
        </div>

        <form
          onSubmit={handleCreate}
          className="mt-4 grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
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
            <label className="mb-1 block text-xs font-medium text-slate-600">
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
            <label className="mb-1 block text-xs font-medium text-slate-600">
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
            <label className="mb-1 block text-xs font-medium text-slate-600">
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
            <label className="mb-1 block text-xs font-medium text-slate-600">
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
            <label className="mb-1 block text-xs font-medium text-slate-600">
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

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
                setSuccess("");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. david@example.com"
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {creating ? "Adding…" : "Add dependent"}
            </button>
          </div>
        </form>
      </section>

      {/* Dependents list */}
      <section className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Saved dependents
          </h2>
          {dependents.length > 0 && (
            <p className="text-xs text-slate-500">
              Click any row to view full profile
            </p>
          )}
        </div>

        {loading && (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading dependents…</span>
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
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dependents.map((dep) => (
                  <tr
                    key={dep.id}
                    onClick={() => handleRowClick(dep.id)}
                    className="group cursor-pointer transition-colors hover:bg-blue-50/50"
                  >
                    <td className="p-3 text-sm font-medium text-slate-900">
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
                    <td className="p-3 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />
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