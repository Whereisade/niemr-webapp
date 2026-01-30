\
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useOutreachSession } from "@/lib/useOutreachSession";
import OutreachEventPicker from "@/components/outreach/OutreachEventPicker";
import { hasPerm, OUTREACH_PERMS, isModuleEnabled } from "@/lib/outreachConfig";
import { withEventId, normalizeList } from "@/lib/outreachApi";
import { ArrowLeft, RefreshCw, Upload, Search, Plus, X, Syringe } from "lucide-react";

function Field({ label, children }) {
  return (
    <label className="grid gap-1">
      <div className="text-xs font-medium text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 " +
        (props.className || "")
      }
    />
  );
}

export default function OutreachVaccineCatalogPage() {
  const {
    loading: sessionLoading,
    error: sessionError,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    permissions,
    switchEvent,
  } = useOutreachSession();

  const modulesEnabled = selectedEvent?.modules_enabled || {};
  const enabled = isModuleEnabled(modulesEnabled, "immunization");
  const canManage = isOutreachSuperAdmin || hasPerm(permissions, OUTREACH_PERMS.IMMUNIZATION_EDIT);

  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", manufacturer: "", code: "" });

  const fileRef = useRef(null);
  const [importFile, setImportFile] = useState(null);

  async function load() {
    if (!selectedEventId) return;
    setBusy(true);
    setErr("");
    try {
      const data = await apiFetch(withEventId("/outreach/immunization-vaccines/", selectedEventId));
      setRows(normalizeList(data));
    } catch (e) {
      setErr(e?.message || "Failed to load vaccine catalog.");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const name = String(r?.name || "").toLowerCase();
      const man = String(r?.manufacturer || "").toLowerCase();
      const code = String(r?.code || "").toLowerCase();
      return name.includes(s) || man.includes(s) || code.includes(s);
    });
  }, [rows, q]);

  async function createOne(e) {
    e.preventDefault();
    if (!canManage) return;
    const name = String(newItem.name || "").trim();
    if (!name) {
      setErr("Vaccine name is required.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const payload = {
        name,
        manufacturer: String(newItem.manufacturer || "").trim(),
        code: String(newItem.code || "").trim(),
      };
      const created = await apiFetch(withEventId("/outreach/immunization-vaccines/", selectedEventId), {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const list = [created, ...rows].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
      setRows(list);
      setNewItem({ name: "", manufacturer: "", code: "" });
      setShowAdd(false);
    } catch (e2) {
      setErr(e2?.message || "Failed to add vaccine.");
    } finally {
      setBusy(false);
    }
  }

  async function importCatalog() {
    if (!canManage || !selectedEventId || !importFile) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      await apiFetch(withEventId("/outreach/immunization-vaccines/import-file/", selectedEventId), {
        method: "POST",
        body: fd,
      });
      setImportFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      setErr(e?.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  if (sessionError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {sessionError}
      </div>
    );
  }

  if (sessionLoading) {
    return <div className="p-6 text-sm text-slate-600">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/outreach/immunizations"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          <div className="text-lg font-semibold text-slate-900">Vaccine catalog</div>
        </div>

        <OutreachEventPicker selectedEventId={selectedEventId} onSelect={switchEvent} />
      </div>

      {selectedEventId && !enabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="text-base font-semibold text-amber-900">Module disabled</div>
          <p className="mt-1 text-sm text-amber-900">Immunization was not activated for the selected outreach event.</p>
        </div>
      ) : null}

      {selectedEventId && enabled && !canManage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="text-base font-semibold text-amber-900">Permission denied</div>
          <p className="mt-1 text-sm text-amber-900">
            You don’t have permission to manage the vaccine catalog. Ask the outreach admin/super admin.
          </p>
        </div>
      ) : null}

      {selectedEventId && enabled && canManage ? (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Syringe className="h-4 w-4" />
                Manage vaccines for this outreach
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={load}
                  disabled={busy}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </button>

                <button
                  onClick={() => setShowAdd((p) => !p)}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  {showAdd ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {showAdd ? "Close" : "Add vaccine"}
                </button>
              </div>
            </div>

            {err ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div> : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-900">Import from CSV/XLSX</div>
                <div className="grid gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm"
                  />
                  <button
                    onClick={importCatalog}
                    disabled={busy || !importFile}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </button>
                  <div className="text-xs text-slate-500">
                    Columns supported: <b>name</b>, optional <b>manufacturer</b>, <b>code</b>.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-slate-900">Search</div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, manufacturer, code…" className="pl-9" />
                </div>
              </div>
            </div>

            {showAdd ? (
              <form onSubmit={createOne} className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="text-sm font-semibold text-slate-900">Add vaccine</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Name *">
                    <TextInput value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
                  </Field>
                  <Field label="Manufacturer">
                    <TextInput value={newItem.manufacturer} onChange={(e) => setNewItem((p) => ({ ...p, manufacturer: e.target.value }))} />
                  </Field>
                  <Field label="Code">
                    <TextInput value={newItem.code} onChange={(e) => setNewItem((p) => ({ ...p, code: e.target.value }))} />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-slate-900">Vaccines ({filtered.length})</div>
            {busy ? <div className="text-sm text-slate-500">Loading…</div> : null}
            {!busy && filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                No vaccines found. Import or add one.
              </div>
            ) : null}

            <div className="grid gap-2">
              {filtered.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{r.name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {r.manufacturer ? r.manufacturer : "—"}{r.code ? ` • ${r.code}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
