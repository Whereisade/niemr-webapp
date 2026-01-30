"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import { hasPerm, OUTREACH_PERMS } from "@/lib/outreachConfig";
import { withEventId } from "@/lib/outreachApi";
import {
  ArrowLeft,
  RefreshCw,
  Upload,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Beaker,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export default function OutreachLabCatalogPage() {
  const {
    loading: sessionLoading,
    error: sessionError,
    assignments,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    permissions,
    switchEvent,
  } = useOutreachSession();

  const canView = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.LAB_CATALOG_VIEW);
  const canManage = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.LAB_CATALOG_MANAGE);

  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  // create
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "",
    ref_low: "",
    ref_high: "",
    price: "",
    is_active: true,
  });

  // import
  const [importFileObj, setImportFileObj] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState("");
  const [importResult, setImportResult] = useState(null);

  // edit
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ price: "", is_active: true });
  const [updating, setUpdating] = useState(false);
  const [updateErr, setUpdateErr] = useState("");

  async function load() {
    if (!selectedEventId) return;
    setBusy(true);
    setErr("");
    try {
      const data = await apiFetch(withEventId("/outreach/labs/tests/", selectedEventId));
      setRows(normalizeList(data));
    } catch (e) {
      setErr(e?.message || "Failed to load lab catalog.");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (selectedEventId) load();
  }, [selectedEventId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((t) => {
      const hay = `${t?.code || ""} ${t?.name || ""} ${t?.unit || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function createTest(e) {
    e.preventDefault();
    if (!selectedEventId) return;
    if (!form.code.trim() || !form.name.trim()) {
      setCreateErr("Code and name are required.");
      return;
    }
    setCreateErr("");
    setCreating(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        unit: (form.unit || "").trim(),
        ref_low: (form.ref_low || "").trim() || null,
        ref_high: (form.ref_high || "").trim() || null,
        price: (form.price || "").toString().trim() || null,
        is_active: !!form.is_active,
        event_id: selectedEventId,
      };
      const created = await apiFetch("/outreach/labs/tests/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRows((p) => [created, ...p]);
      setForm({ code: "", name: "", unit: "", ref_low: "", ref_high: "", price: "", is_active: true });
    } catch (e2) {
      setCreateErr(e2?.message || "Failed to create test.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEdit({ price: row?.price != null ? String(row.price) : "", is_active: row?.is_active !== false });
    setUpdateErr("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEdit({ price: "", is_active: true });
    setUpdateErr("");
  }

  async function saveEdit(id) {
    if (!selectedEventId) return;
    setUpdating(true);
    setUpdateErr("");
    try {
      const payload = { price: edit.price === "" ? null : edit.price, is_active: !!edit.is_active };
      const updated = await apiFetch(withEventId(`/outreach/labs/tests/${id}/`, selectedEventId), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setRows((p) => p.map((x) => (x.id === id ? updated : x)));
      cancelEdit();
    } catch (e2) {
      setUpdateErr(e2?.message || "Failed to update.");
    } finally {
      setUpdating(false);
    }
  }

  async function deleteRow(id) {
    if (!selectedEventId) return;
    if (!confirm("Delete this lab test from the outreach catalog?")) return;
    setBusy(true);
    setErr("");
    try {
      await apiFetch(withEventId(`/outreach/labs/tests/${id}/`, selectedEventId), { method: "DELETE" });
      setRows((p) => p.filter((x) => x.id !== id));
    } catch (e2) {
      setErr(e2?.message || "Failed to delete.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!selectedEventId) return;
    if (!importFileObj) {
      setImportErr("Please select a file.");
      return;
    }
    setImportErr("");
    setImportResult(null);
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", importFileObj);
      const result = await apiFetch(withEventId("/outreach/labs/tests/import-file/", selectedEventId), {
        method: "POST",
        body: fd,
      });
      setImportResult(result);
      setImportFileObj(null);
      await load();
    } catch (e2) {
      setImportErr(e2?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (sessionError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {sessionError}
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Lab catalog not available</div>
        <p className="mt-1 text-sm text-slate-600">You don’t have permission to view the lab catalog for this outreach.</p>
        <div className="mt-4">
          <Link href="/outreach" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to outreach →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <Beaker className="h-3.5 w-3.5" />
            Lab catalog
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Outreach lab tests</h1>
          <p className="mt-2 text-sm text-slate-600">
            This catalog is scoped to the selected outreach event. Import CSV/XLSX or add tests manually.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/outreach/labs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <button
            onClick={load}
            disabled={!selectedEventId || busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <OutreachEventPicker
        loading={sessionLoading}
        assignments={assignments}
        isOutreachSuperAdmin={isOutreachSuperAdmin}
        selectedEventId={selectedEventId}
        selectedEvent={selectedEvent}
        onChange={switchEvent}
      />

      {!selectedEventId ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-slate-900">Select an outreach event</div>
          <p className="mt-1 text-sm text-slate-600">You need an outreach context to manage the lab catalog.</p>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>
      ) : null}

      {selectedEventId ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Create */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="text-base font-semibold text-slate-900">Add test</div>
            <p className="mt-1 text-sm text-slate-600">Create a lab test for this outreach.</p>

            {!canManage ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  You don’t have manage permissions
                </div>
                <p className="mt-1 text-xs text-slate-600">Ask the Outreach Super Admin to grant catalog management.</p>
              </div>
            ) : (
              <form onSubmit={createTest} className="mt-4 grid gap-3">
                {createErr ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{createErr}</div>
                ) : null}

                <div className="grid gap-2">
                  <label className="text-xs font-medium text-slate-600">Code *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. FBC"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-medium text-slate-600">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. Full blood count"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-slate-600">Unit</label>
                    <input
                      value={form.unit}
                      onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="e.g. g/dL"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-slate-600">Price</label>
                    <input
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="optional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-slate-600">Ref low</label>
                    <input
                      value={form.ref_low}
                      onChange={(e) => setForm((p) => ({ ...p, ref_low: e.target.value }))}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="optional"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-slate-600">Ref high</label>
                    <input
                      value={form.ref_high}
                      onChange={(e) => setForm((p) => ({ ...p, ref_high: e.target.value }))}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="optional"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  Active
                </label>

                <button
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {creating ? "Adding…" : "Add test"}
                </button>
              </form>
            )}
          </div>

          {/* Import + list */}
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">Import catalog</div>
                  <p className="mt-1 text-sm text-slate-600">Upload CSV/XLSX with at least <span className="font-medium">code</span> and <span className="font-medium">name</span>.</p>
                </div>

                {canManage ? (
                  <form onSubmit={handleImport} className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50">
                      <Upload className="h-4 w-4" />
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => setImportFileObj(e.target.files?.[0] || null)}
                      />
                      {importFileObj ? "Change file" : "Choose file"}
                    </label>
                    <button
                      disabled={importing || !importFileObj}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                      {importing ? "Importing…" : "Import"}
                    </button>
                  </form>
                ) : null}
              </div>

              {importErr ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{importErr}</div>
              ) : null}

              {importResult ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Import complete
                  </div>
                  <div className="mt-1 text-xs text-emerald-700">
                    Created: {importResult.created} • Updated: {importResult.updated}
                    {Array.isArray(importResult.errors) && importResult.errors.length ? ` • Errors: ${importResult.errors.length}` : ""}
                  </div>
                  {Array.isArray(importResult.errors) && importResult.errors.length ? (
                    <ul className="mt-2 list-disc pl-5 text-xs text-emerald-800">
                      {importResult.errors.slice(0, 6).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by code, name, unit…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="text-sm text-slate-600">{busy ? "Loading…" : `${filtered.length} test${filtered.length === 1 ? "" : "s"}`}</div>
              </div>

              {updateErr ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{updateErr}</div>
              ) : null}

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-slate-500">
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Unit</th>
                      <th className="py-2 pr-4">Ref</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2 pr-4">Status</th>
                      {canManage ? <th className="py-2 pr-2 text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((t) => {
                      const isEditing = editingId === t.id;
                      return (
                        <tr key={t.id} className="align-top">
                          <td className="py-3 pr-4 font-medium text-slate-900">{t.code}</td>
                          <td className="py-3 pr-4 text-slate-800">{t.name}</td>
                          <td className="py-3 pr-4 text-slate-700">{t.unit || "—"}</td>
                          <td className="py-3 pr-4 text-slate-700">
                            {t.ref_low || t.ref_high ? `${t.ref_low || ""}${t.ref_low && t.ref_high ? " – " : ""}${t.ref_high || ""}` : "—"}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {isEditing ? (
                              <input
                                value={edit.price}
                                onChange={(e) => setEdit((p) => ({ ...p, price: e.target.value }))}
                                className="h-9 w-28 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder=""
                              />
                            ) : (
                              t.price ?? "—"
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {isEditing ? (
                              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={!!edit.is_active}
                                  onChange={(e) => setEdit((p) => ({ ...p, is_active: e.target.checked }))}
                                />
                                Active
                              </label>
                            ) : (
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${t.is_active !== false ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                                {t.is_active !== false ? "Active" : "Inactive"}
                              </span>
                            )}
                          </td>
                          {canManage ? (
                            <td className="py-3 pr-2 text-right">
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => saveEdit(t.id)}
                                    disabled={updating}
                                    className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                                  >
                                    <Check className="h-4 w-4" />
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                                  >
                                    <X className="h-4 w-4" />
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => startEdit(t)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteRow(t.id)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}

                    {!busy && selectedEventId && !filtered.length ? (
                      <tr>
                        <td colSpan={canManage ? 7 : 6} className="py-8 text-center text-sm text-slate-600">
                          No tests found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
