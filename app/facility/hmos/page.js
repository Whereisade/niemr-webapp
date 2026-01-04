"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Plus, RefreshCcw, Shield, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.results && Array.isArray(payload.results)) return payload.results;
  // numeric-key object fallback
  if (typeof payload === "object") {
    const keys = Object.keys(payload);
    const isNumeric = keys.length && keys.every((k) => String(Number(k)) === k);
    if (isNumeric) return keys.sort((a, b) => Number(a) - Number(b)).map((k) => payload[k]);
  }
  return [];
}

export default function FacilityHmosPage() {
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isSuperAdmin = useMemo(() => (me?.role || "").toUpperCase() === "SUPER_ADMIN", [me]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const meRes = await apiFetch("/accounts/me/");
      setMe(meRes);

      const res = await apiFetch("/facilities/hmos/");
      setRows(normalizeList(res));
    } catch (e) {
      setError(e?.message || "Failed to load HMOs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createHmo() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/facilities/hmos/", {
        method: "POST",
        body: JSON.stringify({ name: n, is_active: true }),
      });
      setName("");
      await load();
    } catch (e) {
      setError(e?.message || "Failed to create HMO");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(hmo) {
    if (!hmo?.id) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/facilities/hmos/${hmo.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !hmo.is_active }),
      });
      await load();
    } catch (e) {
      setError(e?.message || "Failed to update HMO");
    } finally {
      setBusy(false);
    }
  }

  async function deleteHmo(hmo) {
    if (!hmo?.id) return;
    const ok = window.confirm(`Delete HMO "${hmo.name}"? This will detach pricing overrides too.`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/facilities/hmos/${hmo.id}/`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e?.message || "Failed to delete HMO");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h1 className="text-xl font-semibold">HMO Management</h1>
          </div>
          <p className="text-sm text-slate-600">
            Create HMOs for this facility, and attach patients to an HMO to apply HMO pricing on lab and pharmacy charges.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={loading || busy}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-medium">Facility HMOs</div>
            <div className="text-xs text-slate-600">
              {isSuperAdmin ? "You can create, disable, or delete HMOs." : "You can view HMOs. Only SUPER_ADMIN can edit."}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New HMO name (e.g., NHIS, Hygeia, AXA Mansard)"
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring md:w-[380px]"
              disabled={!isSuperAdmin || busy}
            />
            <button
              onClick={createHmo}
              disabled={!isSuperAdmin || busy || !name.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add HMO
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs text-slate-500">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((h) => (
                  <tr key={h.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3 font-medium">{h.name}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs ${h.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {h.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-slate-600">{h.created_at ? new Date(h.created_at).toLocaleString() : "—"}</td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleActive(h)}
                          disabled={!isSuperAdmin || busy}
                          className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs shadow-sm hover:bg-slate-50 disabled:opacity-50"
                          title={h.is_active ? "Disable" : "Enable"}
                        >
                          {h.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          {h.is_active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => deleteHmo(h)}
                          disabled={!isSuperAdmin || busy}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    No HMOs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Tip: After creating an HMO, go to <span className="font-medium">Patients → Patient → Insurance</span> to attach the patient to an HMO.
          Then update <span className="font-medium">Labs/Pharmacy Catalog</span> in HMO mode to set HMO pricing.
        </div>
      </div>
    </div>
  );
}
