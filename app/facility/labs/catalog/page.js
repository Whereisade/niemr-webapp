"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Beaker, Plus, RefreshCw, ArrowLeft } from "lucide-react";

function normalizeTests(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.results)) return body.results;
  return [];
}

export default function FacilityLabCatalogPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "",
    refLow: "",
    refHigh: "",
    price: "",
    isActive: true,
  });

  async function loadTests() {
    try {
      setLoading(true);
      setLoadingError("");
      const data = await apiFetch("/labs/catalog/");
      setTests(normalizeTests(data));
    } catch (err) {
      console.error("Failed to load lab catalog", err);
      setLoadingError(err?.message || "Failed to load lab catalog");
      setTests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTests();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setCreateError("Code and name are required.");
      return;
    }

    setCreateError("");
    setCreating(true);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      unit: form.unit.trim(),
      // DRF DecimalField can accept string values
      ref_low: form.refLow.trim() || null,
      ref_high: form.refHigh.trim() || null,
      price: form.price.trim() || "0",
      is_active: !!form.isActive,
    };

    try {
      const created = await apiFetch("/labs/catalog/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Prepend new test to list
      setTests((prev) => [created, ...prev]);

      // Reset form
      setForm({
        code: "",
        name: "",
        unit: "",
        refLow: "",
        refHigh: "",
        price: "",
        isActive: true,
      });
    } catch (err) {
      console.error("Failed to create lab test", err);
      setCreateError(err?.message || "Failed to create lab test");
    } finally {
      setCreating(false);
    }
  }

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((t) => {
      return (
        t.code?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.unit?.toLowerCase().includes(q)
      );
    });
  }, [tests, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
              <Beaker className="h-5 w-5 text-sky-700" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => history.back()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
              </p>
              <h1 className="text-lg font-semibold text-slate-900">
                Lab Tests Catalog
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Manage the global list of lab tests (code, name, reference
                ranges, price). These tests are used when creating lab orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={loadTests}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-3 w-3" />
              {loading ? "Refreshing…" : "Refresh"}
            </button>

            <Link
              href="/facility/labs"
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-100 shadow-sm hover:bg-slate-800"
            >
              Go to Lab Orders
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
          {/* New test form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Add New Lab Test
              </h2>
              <Plus className="h-4 w-4 text-slate-400" />
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Code<span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    placeholder="e.g. FBC_HB"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none ring-0 focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Name<span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Full Blood Count (Hb)"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none ring-0 focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unit: e.target.value }))
                    }
                    placeholder="e.g. g/dL"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none ring-0 focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Ref Low
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.refLow}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, refLow: e.target.value }))
                    }
                    placeholder="e.g. 11.5"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none ring-0 focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Ref High
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={form.refHigh}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, refHigh: e.target.value }))
                    }
                    placeholder="e.g. 15.0"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none ring-0 focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    placeholder="e.g. 3500"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none ring-0 focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-[11px] font-medium text-slate-700"
                  >
                    Active (available for ordering)
                  </label>
                </div>
              </div>

              {createError && (
                <p className="text-[11px] text-rose-600">{createError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-3 w-3" />
                  {creating ? "Creating…" : "Create Test"}
                </button>
              </div>

              <p className="mt-1 text-[10px] text-slate-400">
                Only staff with catalog permissions can create lab tests. Other
                users will receive a “Forbidden” error from the API.
              </p>
            </form>
          </section>

          {/* Catalog table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Existing Lab Tests
                </h2>
                {loadingError ? (
                  <p className="mt-0.5 text-[11px] text-rose-600">
                    {loadingError}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {loading
                      ? "Loading lab tests…"
                      : `${filteredTests.length} test(s)`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or name…"
                  className="w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none ring-0 focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100 text-[11px] text-slate-600">
                    <th className="px-3 py-2 text-left font-medium">Code</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Unit</th>
                    <th className="px-3 py-2 text-center font-medium">
                      Ref Low
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      Ref High
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-center font-medium">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.length === 0 && !loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-[11px] text-slate-500"
                      >
                        No lab tests found. Create your first test using the
                        form on the left.
                      </td>
                    </tr>
                  ) : (
                    filteredTests.map((t) => (
                      <tr
                        key={t.id || t.code}
                        className="border-b border-slate-50 last:border-b-0"
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-800">
                          {t.code}
                        </td>
                        <td className="px-3 py-2 text-slate-900">{t.name}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {t.unit || "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-700">
                          {t.ref_low ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-700">
                          {t.ref_high ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900">
                          {t.price ?? 0}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              t.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {t.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
