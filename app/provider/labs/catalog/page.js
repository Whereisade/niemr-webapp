"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (data && typeof data === "object") return Object.values(data);
  return [];
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function ProviderLabsCatalogPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "",
    ref_low: "",
    ref_high: "",
    price: "",
    is_active: true,
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/labs/catalog/");
      setItems(normalizeList(data));
    } catch (e) {
      setError(e?.message || "Failed to load lab catalog.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) => {
      const hay = [
        t?.code,
        t?.name,
        t?.unit,
        String(t?.price ?? ""),
        String(t?.ref_low ?? ""),
        String(t?.ref_high ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        unit: form.unit.trim(),
        ref_low: toNumber(form.ref_low),
        ref_high: toNumber(form.ref_high),
        price: toNumber(form.price),
        is_active: !!form.is_active,
      };

      if (!payload.code || !payload.name) {
        setError("Code and name are required.");
        setSaving(false);
        return;
      }

      await apiFetch("/labs/catalog/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setForm({
        code: "",
        name: "",
        unit: "",
        ref_low: "",
        ref_high: "",
        price: "",
        is_active: true,
      });

      await load();
    } catch (e) {
      setError(e?.message || "Failed to create lab test.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImportCsv(file) {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiFetch("/labs/catalog/import_csv/", { method: "POST", body: fd });
      await load();
    } catch (e) {
      setError(e?.message || "CSV import failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lab catalog</h1>
          <p className="text-sm text-slate-600">
            Your independent lab test catalog (used for inbound external orders).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/provider/labs"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Back to orders
          </Link>

          <label className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 cursor-pointer">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleImportCsv(e.target.files?.[0])}
              disabled={saving}
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-bold text-slate-900">Add test</h2>

          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Code *
              </label>
              <input
                value={form.code}
                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. CBC"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. Full blood count"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Unit
              </label>
              <input
                value={form.unit}
                onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. g/dL"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Ref low
                </label>
                <input
                  value={form.ref_low}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, ref_low: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="e.g. 3.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Ref high
                </label>
                <input
                  value={form.ref_high}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, ref_high: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="e.g. 5.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Price
              </label>
              <input
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 2500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) =>
                  setForm((s) => ({ ...s, is_active: e.target.checked }))
                }
              />
              Active
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create test"}
            </button>
          </div>
        </form>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              Tests ({filtered.length})
            </h2>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Search code, name..."
            />
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2 pr-4">Range</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={6}>
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length ? (
                  filtered.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-mono">{t.code || "—"}</td>
                      <td className="py-2 pr-4">{t.name || "—"}</td>
                      <td className="py-2 pr-4">{t.unit || "—"}</td>
                      <td className="py-2 pr-4">
                        {t.ref_low ?? "—"} – {t.ref_high ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {t.price ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {t.is_active ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={6}>
                      No tests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Tip: If you want bulk updates, import a CSV again using the same codes.
          </p>
        </div>
      </div>
    </div>
  );
}
