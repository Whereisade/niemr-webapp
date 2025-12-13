"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pill,
  Upload,
  Plus,
  Search,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "PHARMACY"];

export default function FacilityPharmacyCatalogPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [drugs, setDrugs] = useState([]);
  const [loadingDrugs, setLoadingDrugs] = useState(true);
  const [errorDrugs, setErrorDrugs] = useState(null);

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  // Simple create form state
  const [form, setForm] = useState({
    code: "",
    name: "",
    strength: "",
    form: "",
    route: "",
    qty_per_unit: 1,
    unit_price: "",
  });

  // --- load current user & guard roles ---
  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const json = await res.json();
        if (!cancelled) setMe(json);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const meRole = (me?.role || "").toUpperCase();
  const canManage = useMemo(
    () => STAFF_ROLES.includes(meRole),
    [meRole]
  );

  // --- load drugs ---
  async function loadDrugs() {
    setLoadingDrugs(true);
    setErrorDrugs(null);
    try {
      const res = await fetch("/api/proxy/pharmacy/catalog/", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load catalog (${res.status})`);
      }
      const json = await res.json();
      setDrugs(Array.isArray(json) ? json : json.results || []);
    } catch (err) {
      setErrorDrugs(err.message || "Failed to load catalog.");
    } finally {
      setLoadingDrugs(false);
    }
  }

  useEffect(() => {
    if (!loadingMe && me) {
      loadDrugs();
    }
  }, [loadingMe, me]);

  const filteredDrugs = useMemo(() => {
    if (!search.trim()) return drugs;
    const s = search.toLowerCase();
    return drugs.filter((d) => {
      return (
        d.code?.toLowerCase().includes(s) ||
        d.name?.toLowerCase().includes(s) ||
        d.strength?.toLowerCase().includes(s)
      );
    });
  }, [drugs, search]);

  // --- handlers ---

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const payload = {
        ...form,
        qty_per_unit: Number(form.qty_per_unit) || 1,
        unit_price: form.unit_price || "0",
        is_active: true,
      };
      const res = await fetch("/api/proxy/pharmacy/catalog/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `Failed to create drug (${res.status})`;
        try {
          const err = await res.json();
          if (err && (err.detail || err.non_field_errors)) {
            msg = err.detail || err.non_field_errors.join(", ");
          }
        } catch {}
        throw new Error(msg);
      }
      await loadDrugs();
      setForm({
        code: "",
        name: "",
        strength: "",
        form: "",
        route: "",
        qty_per_unit: 1,
        unit_price: "",
      });
    } catch (err) {
      setCreateError(err.message || "Failed to create drug.");
    } finally {
      setCreating(false);
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!csvFile) {
      setImportError("Select a CSV file first.");
      return;
    }
    setImportError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);

      const res = await fetch(
        "/api/proxy/pharmacy/catalog/import_csv/",
        {
          method: "POST",
          body: fd,
        }
      );
      if (!res.ok) {
        let msg = `Import failed (${res.status})`;
        try {
          const err = await res.json();
          if (err && err.detail) msg = err.detail;
        } catch {}
        throw new Error(msg);
      }
      const json = await res.json();
      setImportResult(json);
      await loadDrugs();
      setCsvFile(null);
    } catch (err) {
      setImportError(err.message || "Failed to import CSV.");
    } finally {
      setImporting(false);
    }
  }

  // --- guards ---

  if (loadingMe) {
    return (
      <main className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Checking permissions…
        </div>
      </main>
    );
  }

  if (!me || !canManage) {
    return (
      <main className="mx-auto max-w-3xl p-6 md:p-10">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <ArrowLeft className="h-4 w-4" />
          <Link
            href="/facility/pharmacy"
            className="text-sky-700 hover:underline"
          >
            Back to Pharmacy
          </Link>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          You do not have permission to manage the drug catalog.
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      {/* soft background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            <Pill className="h-3.5 w-3.5" />
            Facility Pharmacy · Catalog
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Drug catalog
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage the list of drugs available for prescribing and dispensing.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Link
            href="/facility/pharmacy"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Pharmacy
          </Link>
        </div>
      </header>

      {/* Top row: search + import + create form */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        {/* Search + list meta */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Catalog
            </div>
            <div className="text-xs text-slate-500">
              Total:{" "}
              <span className="font-semibold text-slate-800">
                {drugs.length}
              </span>
            </div>
          </div>
          <div className="relative mb-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="search"
              placeholder="Search by name, code, strength…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          {loadingDrugs ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading catalog…
            </div>
          ) : errorDrugs ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {errorDrugs}
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">
                      Code
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Strength
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Form / Route
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Unit price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredDrugs.length ? (
                    filteredDrugs.map((d) => (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-50/70 transition"
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-700">
                          {d.code}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">
                          {d.name}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {d.strength || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {d.form || "—"}{" "}
                          {d.route ? `· ${d.route}` : ""}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-slate-800">
                          {d.unit_price ?? 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-xs text-slate-500"
                      >
                        No drugs found. Add a drug or import from CSV.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: CSV import + create */}
        <div className="space-y-4">
          {/* CSV Import */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
                <Upload className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Import from CSV
                </div>
                <div className="text-[11px] text-slate-500">
                  Columns: code,name,strength,form,route,qty_per_unit,unit_price
                </div>
              </div>
            </div>
            <form onSubmit={handleImport} className="space-y-2 text-xs">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setCsvFile(e.target.files?.[0] || null);
                  setImportError(null);
                  setImportResult(null);
                }}
                className="w-full text-xs text-slate-700"
              />
              {importError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
                  {importError}
                </div>
              )}
              {importResult && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                  Imported: {importResult.created} created,{" "}
                  {importResult.updated} updated.
                </div>
              )}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={importing}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {importing ? "Importing…" : "Import CSV"}
                </button>
              </div>
            </form>
          </div>

          {/* Create single drug */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
                <Plus className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Add drug
                </div>
                <div className="text-[11px] text-slate-500">
                  Create a single catalog entry.
                </div>
              </div>
            </div>
            <form onSubmit={handleCreate} className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Code
                  </label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Strength
                  </label>
                  <input
                    value={form.strength}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, strength: e.target.value }))
                    }
                    placeholder="500mg"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Form
                  </label>
                  <input
                    value={form.form}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, form: e.target.value }))
                    }
                    placeholder="Tablet"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Route
                  </label>
                  <input
                    value={form.route}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, route: e.target.value }))
                    }
                    placeholder="Oral"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Qty per unit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.qty_per_unit}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        qty_per_unit: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Unit price
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.unit_price}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        unit_price: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {createError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
                  {createError}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
                >
                  {creating ? "Saving…" : "Add drug"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
