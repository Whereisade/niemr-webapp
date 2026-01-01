"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Pill,
  Upload,
  Plus,
  Search,
  Loader2,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Info,
  CheckCircle2,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Edit2,
  X,
} from "lucide-react";
import { deleteDrug, clearPharmacyCatalog } from "@/lib/catalogActions";

export default function ProviderPharmacyCatalogPage() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [drugs, setDrugs] = useState([]);
  const [loadingDrugs, setLoadingDrugs] = useState(true);
  const [errorDrugs, setErrorDrugs] = useState(null);

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  // Delete state
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [clearingCatalog, setClearingCatalog] = useState(false);

  // Edit state
  const [editingDrug, setEditingDrug] = useState(null);
  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    strength: "",
    form: "",
    route: "",
    qty_per_unit: 1,
    unit_price: "",
  });
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

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

  // --- load current user ---
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
  const providerType = (me?.provider?.provider_type || "").toUpperCase();
  const isPharmacyProvider = meRole === "PHARMACY" || providerType === "PHARMACIST";

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
    if (!importFile) {
      setImportError("Please select a file to import.");
      return;
    }

    setImportError(null);
    setImportResult(null);
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/proxy/pharmacy/catalog/import_file/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let msg = `Import failed (${res.status})`;
        try {
          const err = await res.json();
          if (err && err.detail) msg = err.detail;
        } catch {}
        throw new Error(msg);
      }

      const result = await res.json();
      setImportResult(result);
      await loadDrugs();
      setImportFile(null);
    } catch (err) {
      console.error("Failed to import file", err);
      setImportError(err?.message || "Failed to import file");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(drugId) {
    if (!window.confirm("Are you sure you want to delete this drug? This action cannot be undone.")) {
      return;
    }

    setDeleting(drugId);
    setDeleteError("");

    try {
      await deleteDrug(drugId);
      // Remove from local state
      setDrugs((prev) => prev.filter((d) => d.id !== drugId));
    } catch (err) {
      console.error("Failed to delete drug", err);
      setDeleteError(err?.message || "Failed to delete drug");
    } finally {
      setDeleting(null);
    }
  }

  async function handleClearCatalog() {
    if (!window.confirm("⚠️ WARNING: This will delete ALL drugs in your catalog. This action cannot be undone. Are you absolutely sure?")) {
      return;
    }

    // Double confirmation for destructive action
    if (!window.confirm("This is your final confirmation. Click OK to permanently delete all drugs.")) {
      return;
    }

    setClearingCatalog(true);
    setDeleteError("");

    try {
      const result = await clearPharmacyCatalog();
      setDrugs([]);
      alert(result?.detail || "Catalog cleared successfully");
    } catch (err) {
      console.error("Failed to clear catalog", err);
      setDeleteError(err?.message || "Failed to clear catalog");
    } finally {
      setClearingCatalog(false);
    }
  }

  function openEditModal(drug) {
    setEditingDrug(drug);
    setEditForm({
      code: drug.code || "",
      name: drug.name || "",
      strength: drug.strength || "",
      form: drug.form || "",
      route: drug.route || "",
      qty_per_unit: drug.qty_per_unit || 1,
      unit_price: drug.unit_price || "",
    });
    setUpdateError(null);
  }

  function closeEditModal() {
    setEditingDrug(null);
    setEditForm({
      code: "",
      name: "",
      strength: "",
      form: "",
      route: "",
      qty_per_unit: 1,
      unit_price: "",
    });
    setUpdateError(null);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingDrug) return;

    setUpdateError(null);
    setUpdating(true);

    try {
      const payload = {
        ...editForm,
        qty_per_unit: Number(editForm.qty_per_unit) || 1,
        unit_price: editForm.unit_price || "0",
        is_active: true,
      };

      const res = await fetch(`/api/proxy/pharmacy/catalog/${editingDrug.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Failed to update drug (${res.status})`;
        try {
          const err = await res.json();
          if (err && (err.detail || err.non_field_errors)) {
            msg = err.detail || err.non_field_errors.join(", ");
          }
        } catch {}
        throw new Error(msg);
      }

      await loadDrugs();
      closeEditModal();
    } catch (err) {
      setUpdateError(err.message || "Failed to update drug.");
    } finally {
      setUpdating(false);
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

  if (!me || !isPharmacyProvider) {
    return (
      <main className="mx-auto max-w-3xl p-6 md:p-10">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <ArrowLeft className="h-4 w-4" />
          <Link
            href="/provider/pharmacy"
            className="text-sky-700 hover:underline"
          >
            Back to Pharmacy
          </Link>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          You do not have permission to manage the drug catalog. This feature is only available to pharmacy providers.
        </div>
      </main>
    );
  }

  const fileExtension = importFile ? importFile.name.split('.').pop().toLowerCase() : '';
  const isValidFile = ['csv', 'xlsx', 'xls'].includes(fileExtension);

  return (
    <main className="relative mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* soft background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            <Pill className="h-3.5 w-3.5" />
            Independent Provider · Pharmacy Catalog
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Drug Catalog
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your drug catalog. Import from CSV/Excel or add drugs individually.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {drugs.length > 0 && (
            <button
              type="button"
              onClick={handleClearCatalog}
              disabled={clearingCatalog}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AlertTriangle className="h-3 w-3" />
              {clearingCatalog ? "Clearing…" : "Clear Catalog"}
            </button>
          )}
          <Link
            href="/provider/pharmacy"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Pharmacy
          </Link>
        </div>
      </header>

      {/* Delete error banner */}
      {deleteError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900">Delete failed</p>
              <p className="mt-1 text-xs text-rose-800">{deleteError}</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteError("")}
              className="text-rose-600 hover:text-rose-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Column Requirements Info */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100">
            <Info className="h-4 w-4 text-blue-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900">File Format Requirements</h3>
            <p className="mt-1 text-xs text-blue-800">
              Your CSV or Excel file must contain the following columns (case-insensitive):
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-200 bg-white px-3 py-2">
                <div className="text-xs font-semibold text-blue-900">Required Columns:</div>
                <ul className="mt-1 space-y-0.5 text-xs text-blue-700">
                  <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">code</code> - Drug code (e.g., PARA_500_TAB)</li>
                  <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">name</code> - Drug name (e.g., Paracetamol)</li>
                </ul>
              </div>
              <div className="rounded-lg border border-blue-200 bg-white px-3 py-2">
                <div className="text-xs font-semibold text-blue-900">Optional Columns:</div>
                <ul className="mt-1 space-y-0.5 text-xs text-blue-700">
                  <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">strength</code> - Drug strength (e.g., 500mg)</li>
                  <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">form</code> - Drug form (e.g., Tablet, Syrup)</li>
                  <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">route</code> - Route (e.g., Oral, IV, IM)</li>
                  <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">qty_per_unit</code> - Qty per unit (e.g., 10)</li>
                  <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">unit_price</code> - Unit price (e.g., 250)</li>
                </ul>
              </div>
            </div>
            <p className="mt-2 text-xs text-blue-700">
              <strong>Supported formats:</strong> CSV (.csv), Excel (.xlsx, .xls)
            </p>
          </div>
        </div>
      </section>

      {/* Top row: Import + Create + Catalog */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        {/* Catalog table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Drug Catalog
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
            <div className="max-h-[480px] overflow-y-auto rounded-lg border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-700">
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
                    <th className="px-3 py-2 text-center font-semibold">
                      Actions
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
                          ₦{Number(d.unit_price ?? 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(d)}
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(d.id)}
                              disabled={deleting === d.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3 w-3" />
                              {deleting === d.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-xs text-slate-500"
                      >
                        No drugs found. Import from file or add drugs manually.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: import + create */}
        <div className="space-y-4">
          {/* Import from File */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50">
                <Upload className="h-4 w-4 text-emerald-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Import from File
                </div>
                <div className="text-[11px] text-slate-500">
                  Upload CSV or Excel file to import multiple drugs
                </div>
              </div>
            </div>
            <form onSubmit={handleImport} className="space-y-2 text-xs">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Select File
                </label>
                <div className="flex items-center gap-2">
                  <label className="relative flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs transition hover:border-emerald-500 hover:bg-emerald-50">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        setImportFile(e.target.files?.[0] || null);
                        setImportError(null);
                        setImportResult(null);
                      }}
                      className="sr-only"
                    />
                    {importFile ? (
                      <div className="flex items-center gap-2">
                        {fileExtension === 'csv' ? (
                          <FileText className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        )}
                        <span className="truncate text-slate-700">{importFile.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">Choose CSV or Excel file…</span>
                    )}
                  </label>
                  {importFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportFile(null);
                        setImportError(null);
                        setImportResult(null);
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {importFile && !isValidFile && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Warning: File type may not be supported. Use .csv, .xlsx, or .xls
                  </p>
                )}
              </div>

              {importError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <p className="text-[11px] text-rose-800">{importError}</p>
                </div>
              )}

              {importResult && (
                <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-[11px] font-medium text-emerald-900">
                        {importResult.message || 'Import successful'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-emerald-700">
                        Created: {importResult.created}, Updated: {importResult.updated}
                      </p>
                      {importResult.errors && importResult.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[11px] font-medium text-emerald-800">
                            View {importResult.error_count} error(s)
                          </summary>
                          <ul className="mt-1 space-y-0.5 text-[10px] text-emerald-700">
                            {importResult.errors.map((err, idx) => (
                              <li key={idx}>• {err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Upload className="h-3 w-3" />
                  {importing ? "Importing…" : "Import File"}
                </button>
              </div>
            </form>
          </div>

          {/* Create single drug */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50">
                <Plus className="h-4 w-4 text-sky-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Add Single Drug
                </div>
                <div className="text-[11px] text-slate-500">
                  Create one drug at a time
                </div>
              </div>
            </div>
            <form onSubmit={handleCreate} className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Code<span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    placeholder="e.g. PARA_500"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block font-medium text-slate-700">
                    Name<span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Paracetamol"
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
                    placeholder="250"
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
                  <Plus className="h-3 w-3" />
                  {creating ? "Saving…" : "Add Drug"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Edit Drug Modal */}
      {editingDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 to-indigo-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-600">
                  <Edit2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Edit Drug
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {editingDrug.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Code<span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={editForm.code}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, code: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Name<span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Strength
                    </label>
                    <input
                      value={editForm.strength}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, strength: e.target.value }))
                      }
                      placeholder="e.g. 500mg"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Form
                    </label>
                    <input
                      value={editForm.form}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, form: e.target.value }))
                      }
                      placeholder="e.g. Tablet"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Route
                    </label>
                    <input
                      value={editForm.route}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, route: e.target.value }))
                      }
                      placeholder="e.g. Oral"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Qty per unit
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.qty_per_unit}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          qty_per_unit: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Unit price<span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={editForm.unit_price}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          unit_price: e.target.value,
                        }))
                      }
                      placeholder="e.g. 250"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>

                {updateError && (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-rose-900">Update failed</p>
                      <p className="mt-1 text-xs text-rose-800">{updateError}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}