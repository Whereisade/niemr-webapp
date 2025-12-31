"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { deleteLabTest, clearLabCatalog } from "@/lib/catalogActions";
import { 
  Beaker, 
  Plus, 
  RefreshCw, 
  ArrowLeft, 
  Upload,
  FileSpreadsheet,
  FileText,
  Info,
  CheckCircle2,
  AlertCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";

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

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");

  // Delete state
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [clearingCatalog, setClearingCatalog] = useState(false);

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

      setTests((prev) => [created, ...prev]);

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

  async function handleImport(e) {
    e.preventDefault();
    if (!importFile) {
      setImportError("Please select a file to import.");
      return;
    }

    setImportError("");
    setImportResult(null);
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/proxy/labs/catalog/import_file/", {
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
      await loadTests();
      setImportFile(null);
    } catch (err) {
      console.error("Failed to import file", err);
      setImportError(err?.message || "Failed to import file");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(testId) {
    if (!window.confirm("Are you sure you want to delete this test? This action cannot be undone.")) {
      return;
    }

    setDeleting(testId);
    setDeleteError("");

    try {
      await deleteLabTest(testId);
      // Remove from local state
      setTests((prev) => prev.filter((t) => t.id !== testId));
    } catch (err) {
      console.error("Failed to delete lab test", err);
      setDeleteError(err?.message || "Failed to delete lab test");
    } finally {
      setDeleting(null);
    }
  }

  async function handleClearCatalog() {
    if (!window.confirm("⚠️ WARNING: This will delete ALL tests in your catalog. This action cannot be undone. Are you absolutely sure?")) {
      return;
    }

    // Double confirmation for destructive action
    if (!window.confirm("This is your final confirmation. Click OK to permanently delete all lab tests.")) {
      return;
    }

    setClearingCatalog(true);
    setDeleteError("");

    try {
      const result = await clearLabCatalog();
      setTests([]);
      alert(result?.detail || "Catalog cleared successfully");
    } catch (err) {
      console.error("Failed to clear catalog", err);
      setDeleteError(err?.message || "Failed to clear catalog");
    } finally {
      setClearingCatalog(false);
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

  const fileExtension = importFile ? importFile.name.split('.').pop().toLowerCase() : '';
  const isValidFile = ['csv', 'xlsx', 'xls'].includes(fileExtension);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
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
                Manage your facility's lab test catalog. Import from CSV/Excel or add tests individually.
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

            {tests.length > 0 && (
              <button
                type="button"
                onClick={handleClearCatalog}
                disabled={clearingCatalog}
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-700 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AlertTriangle className="h-3 w-3" />
                {clearingCatalog ? "Clearing…" : "Clear Catalog"}
              </button>
            )}

            <Link
              href="/facility/labs"
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-100 shadow-sm hover:bg-slate-800"
            >
              Lab Orders
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
                    <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">code</code> - Test code (e.g., FBC_HB)</li>
                    <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">name</code> - Test name (e.g., Full Blood Count)</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-blue-200 bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-blue-900">Optional Columns:</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-blue-700">
                    <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">unit</code> - Unit of measurement (e.g., g/dL)</li>
                    <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">ref_low</code> - Reference range low (e.g., 11.5)</li>
                    <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">ref_high</code> - Reference range high (e.g., 15.0)</li>
                    <li>• <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">price</code> - Test price (e.g., 3500)</li>
                  </ul>
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-700">
                <strong>Supported formats:</strong> CSV (.csv), Excel (.xlsx, .xls)
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
          {/* Left column: Import + Create */}
          <div className="space-y-4">
            {/* File Import */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50">
                  <Upload className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Import from File
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Upload CSV or Excel file to import multiple tests
                  </p>
                </div>
              </div>

              <form onSubmit={handleImport} className="space-y-3 text-xs">
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
                          setImportError("");
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
                          setImportError("");
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

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="submit"
                    disabled={importing || !importFile}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="h-3 w-3" />
                    {importing ? "Importing…" : "Import File"}
                  </button>
                </div>
              </form>
            </section>

            {/* Create single test */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50">
                    <Plus className="h-4 w-4 text-sky-700" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Add Single Test
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Create one test at a time
                    </p>
                  </div>
                </div>
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
                      placeholder="e.g. Hemoglobin"
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
                    {creating ? "Creating…" : "Add Test"}
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Catalog table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Lab Tests Catalog
                </h2>
                {loadingError ? (
                  <p className="mt-0.5 text-[11px] text-rose-600">
                    {loadingError}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {loading
                      ? "Loading lab tests…"
                      : `${filteredTests.length} test(s) in catalog`}
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
                    <th className="px-3 py-2 text-center font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTests.length === 0 && !loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-[11px] text-slate-500"
                      >
                        No lab tests found. Import from file or add tests manually.
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
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            disabled={deleting === t.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-3 w-3" />
                            {deleting === t.id ? "Deleting…" : "Delete"}
                          </button>
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