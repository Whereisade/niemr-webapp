"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  OUTREACH_MODULES,
  OUTREACH_ROLE_TEMPLATES,
  OUTREACH_ROLE_DEFAULTS,
  filterPermissionGroupsByModules,
} from "@/lib/outreachConfig";
import { useOutreachSession } from "@/lib/useOutreachSession";
import {
  ArrowLeft,
  RefreshCw,
  Settings2,
  Shield,
  MapPin,
  Users,
  Plus,
  Trash2,
  Save,
  KeyRound,
  Ban,
  CheckCircle2,
  FileDown,
  Lock,
} from "lucide-react";

function fmtDT(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    rose: "bg-rose-100 text-rose-800 ring-rose-200",
    blue: "bg-blue-100 text-blue-800 ring-blue-200",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone] || tones.slate}`}>{children}</span>;
}

export default function OutreachEventDetailPage() {
  const params = useParams();
  const eventId = params?.id;

  const { isOutreachSuperAdmin } = useOutreachSession();
  const [tab, setTab] = useState("overview");

  const [evt, setEvt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [sites, setSites] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({ email: "", full_name: "", role_template: "CLINICIAN", permissions: null, all_sites: true, site_ids: [] });
  const [newSite, setNewSite] = useState({ name: "", community: "", address: "" });

  const [passwordResetInfo, setPasswordResetInfo] = useState(null);
  const permissionGroups = useMemo(
    () => filterPermissionGroupsByModules(evt?.modules_enabled || {}),
    [evt?.modules_enabled]
  );

  const permLabelMap = useMemo(() => {
    const m = {};
    (permissionGroups || []).forEach((g) => {
      (g?.perms || []).forEach((p) => {
        if (p?.key) m[p.key] = p.label || p.key;
      });
    });
    return m;
  }, [permissionGroups]);

  const permLabel = (key) => permLabelMap[key] || key;

  async function loadAll() {
    if (!eventId) return;
    setBusy(true);
    setErr("");
    try {
      const [e, s, st] = await Promise.all([
        apiFetch(`/outreach/events/${eventId}/`),
        apiFetch(`/outreach/events/${eventId}/sites/`).catch(() => []),
        apiFetch(`/outreach/events/${eventId}/staff/`).catch(() => []),
      ]);
      setEvt(e);
      setSites(Array.isArray(s) ? s : s?.results || []);
      setStaff(Array.isArray(st) ? st : st?.results || []);
    } catch (e2) {
      setErr(e2?.message || "Failed to load outreach event.");
      setEvt(null);
      setSites([]);
      setStaff([]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (eventId) loadAll();
  }, [eventId]);

  async function saveEventModules() {
    if (!evt) return;
    setBusy(true);
    setErr("");
    try {
      const updated = await apiFetch(`/outreach/events/${eventId}/`, {
        method: "PATCH",
        body: JSON.stringify({ modules_enabled: evt.modules_enabled }),
      });
      setEvt(updated);
    } catch (e) {
      setErr(e?.message || "Failed to update event.");
    } finally {
      setBusy(false);
    }
  }

  async function activateEvent() {
    if (!confirm("Activate this outreach? Staff will be able to log in and document visits.")) return;
    setBusy(true);
    setErr("");
    try {
      const updated = await apiFetch(`/outreach/events/${eventId}/activate/`, { method: "POST" });
      setEvt(updated);
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Failed to activate outreach.");
    } finally {
      setBusy(false);
    }
  }

  async function closeEvent() {
    if (!confirm("Close this outreach? This will disable all staff logins for this outreach.")) return;
    setBusy(true);
    setErr("");
    try {
      // Close endpoint returns a summary message, so we reload the event after.
      await apiFetch(`/outreach/events/${eventId}/close/`, { method: "POST" });
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Failed to close outreach.");
    } finally {
      setBusy(false);
    }
  }

  function defaultPermsFor(role) {
    return OUTREACH_ROLE_DEFAULTS[role] ? [...OUTREACH_ROLE_DEFAULTS[role]] : [];
  }

  async function createSite() {
    setErr("");
    if (!newSite.name.trim()) {
      setErr("Site name is required.");
      return;
    }
    setBusy(true);
    try {
      const created = await apiFetch(`/outreach/events/${eventId}/sites/`, {
        method: "POST",
        body: JSON.stringify({
          name: newSite.name.trim(),
          community: newSite.community?.trim() || "",
          address: newSite.address?.trim() || "",
        }),
      });
      setSites((p) => [created, ...p]);
      setNewSite({ name: "", community: "", address: "" });
    } catch (e) {
      setErr(e?.message || "Failed to create site.");
    } finally {
      setBusy(false);
    }
  }

  async function updateSite(siteId, patch) {
    setBusy(true);
    setErr("");
    try {
      const updated = await apiFetch(`/outreach/sites/${siteId}/`, { method: "PATCH", body: JSON.stringify(patch) });
      setSites((p) => p.map((s) => (s.id === siteId ? updated : s)));
    } catch (e) {
      setErr(e?.message || "Failed to update site.");
    } finally {
      setBusy(false);
    }
  }

  async function createStaff() {
    setErr("");
    setPasswordResetInfo(null);
    if (!newStaff.email.trim()) {
      setErr("Staff email is required.");
      return;
    }
    setBusy(true);
    try {
      const role = newStaff.role_template || "CLINICIAN";
      const perms =
        Array.isArray(newStaff.permissions) && newStaff.permissions.length
          ? newStaff.permissions
          : defaultPermsFor(role);

      const created = await apiFetch(`/outreach/events/${eventId}/staff/`, {
        method: "POST",
        body: JSON.stringify({
          email: newStaff.email.trim(),
          full_name: newStaff.full_name?.trim() || newStaff.email.trim(),
          role_template: role,
          permissions: perms,
          all_sites: !!newStaff.all_sites,
          site_ids: newStaff.all_sites ? [] : (newStaff.site_ids || []).map(Number),
        }),
      });
      setStaff((p) => [created, ...p]);
      setNewStaff({ email: "", full_name: "", role_template: "CLINICIAN", permissions: null, all_sites: true, site_ids: [] });

      // Backend returns one-time credentials in `credentials`
      const credEmail = created?.credentials?.email || newStaff.email.trim();
      const credPass = created?.credentials?.password;
      if (credPass) setPasswordResetInfo({ email: credEmail, password: credPass });
    } catch (e) {
      setErr(e?.message || "Failed to create staff.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStaff(profileId, patch) {
    setBusy(true);
    setErr("");
    try {
      const updated = await apiFetch(`/outreach/events/${eventId}/staff/${profileId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setStaff((p) => p.map((s) => (s.id === profileId ? updated : s)));
    } catch (e) {
      setErr(e?.message || "Failed to update staff.");
    } finally {
      setBusy(false);
    }
  }

  async function resetStaffPassword(profileId) {
    setBusy(true);
    setErr("");
    setPasswordResetInfo(null);
    try {
      const out = await apiFetch(`/outreach/events/${eventId}/staff/${profileId}/reset-password/`, { method: "POST" });
      const credEmail = out?.credentials?.email;
      const credPass = out?.credentials?.password;
      if (credPass) setPasswordResetInfo({ email: credEmail, password: credPass });
    } catch (e) {
      setErr(e?.message || "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOutreachSuperAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Not available</div>
        <p className="mt-1 text-sm text-slate-600">Only Outreach Super Admin can access event management.</p>
        <div className="mt-4">
          <Link href="/outreach" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to outreach →
          </Link>
        </div>
      </div>
    );
  }

  const status = evt?.status || "DRAFT";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/outreach/events"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{evt?.title || "Outreach event"}</h1>
              <Pill tone={status === "CLOSED" ? "rose" : status === "ACTIVE" ? "green" : "slate"}>{status}</Pill>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {evt?.starts_at ? `Starts: ${fmtDT(evt.starts_at)}` : "No start date"}{" "}
              {evt?.ends_at ? `• Ends: ${fmtDT(evt.ends_at)}` : ""}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {status === "DRAFT" ? (
            <button
              onClick={activateEvent}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 disabled:opacity-60"
              title="Activate outreach"
            >
              <CheckCircle2 className="h-4 w-4" />
              Activate
            </button>
          ) : null}

          {status !== "CLOSED" ? (
            <button
              onClick={closeEvent}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-100"
            >
              <Lock className="h-4 w-4" />
              Close outreach
            </button>
          ) : null}
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {[
          { key: "overview", label: "Overview", icon: Settings2 },
          { key: "modules", label: "Modules", icon: Shield },
          { key: "sites", label: "Sites", icon: MapPin },
          { key: "staff", label: "Staff", icon: Users },
          { key: "reports", label: "Reports", icon: FileDown },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm ring-1 transition ${
                active ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Overview</div>
          <p className="mt-1 text-sm text-slate-600">{evt?.description || "—"}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">Created</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{fmtDT(evt?.created_at)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">Last updated</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{fmtDT(evt?.updated_at)}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/outreach/reports"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <FileDown className="h-4 w-4" />
              Go to Reports
            </Link>
            <Link
              href={`/outreach/patients?event=${encodeURIComponent(eventId)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Users className="h-4 w-4" />
              View Patients
            </Link>
          </div>
        </div>
      ) : null}

      {tab === "modules" ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">Modules enabled</div>
              <p className="text-sm text-slate-600">Toggles affect what appears for staff.</p>
            </div>
            <button
              onClick={saveEventModules}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save changes
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(OUTREACH_MODULES).map((m) => (
              <label key={m.key} className="flex items-start gap-2 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={!!evt?.modules_enabled?.[m.key]}
                  onChange={() => setEvt((p) => ({ ...p, modules_enabled: { ...(p?.modules_enabled || {}), [m.key]: !p?.modules_enabled?.[m.key] } }))}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{m.label}</div>
                  <div className="text-xs text-slate-600">{m.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "sites" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Add site</div>
            <p className="mt-1 text-sm text-slate-600">Sites are optional but help reporting and coordination.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                value={newSite.name}
                onChange={(e) => setNewSite((p) => ({ ...p, name: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Name *"
              />
              <input
                value={newSite.community}
                onChange={(e) => setNewSite((p) => ({ ...p, community: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Community"
              />
              <input
                value={newSite.address}
                onChange={(e) => setNewSite((p) => ({ ...p, address: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Address"
              />
            </div>

            <button
              type="button"
              onClick={createSite}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add site
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Sites</div>
            <p className="mt-1 text-sm text-slate-600">{sites.length} site(s)</p>

            <div className="mt-4 space-y-3">
              {sites.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                    <Pill tone={s.is_active === false ? "rose" : "green"}>{s.is_active === false ? "Disabled" : "Active"}</Pill>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <input
                      defaultValue={s.name}
                      onBlur={(e) => updateSite(s.id, { name: e.target.value })}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <input
                      defaultValue={s.community || ""}
                      onBlur={(e) => updateSite(s.id, { community: e.target.value })}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Community"
                    />
                    <input
                      defaultValue={s.address || ""}
                      onBlur={(e) => updateSite(s.id, { address: e.target.value })}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Address"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        defaultChecked={s.is_active !== false}
                        onChange={(e) => updateSite(s.id, { is_active: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                </div>
              ))}

              {!sites.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  No sites yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "staff" ? (
        <div className="space-y-5">
          {passwordResetInfo ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Temporary password generated
              </div>
              <div className="mt-2 font-mono text-xs">
                {passwordResetInfo.email} → {passwordResetInfo.password}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Add staff</div>
            <p className="mt-1 text-sm text-slate-600">Creates a temporary staff account scoped to this outreach.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                value={newStaff.email}
                onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Email *"
              />
              <input
                value={newStaff.full_name}
                onChange={(e) => setNewStaff((p) => ({ ...p, full_name: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Full name"
              />
              <select
                value={newStaff.role_template}
                onChange={(e) => setNewStaff((p) => ({ ...p, role_template: e.target.value, permissions: null }))}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {OUTREACH_ROLE_TEMPLATES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={!!newStaff.all_sites}
                  onChange={(e) => setNewStaff((p) => ({ ...p, all_sites: e.target.checked, site_ids: [] }))}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-900">Access all sites</div>
                  <div className="text-xs text-slate-600">If off, choose specific sites later.</div>
                </div>
              </label>

              <label className="block space-y-1">
                <div className="text-sm font-medium text-slate-700">Custom permissions (optional)</div>
                <select
                  multiple
                  value={
                    Array.isArray(newStaff.permissions) && newStaff.permissions.length
                      ? newStaff.permissions
                      : defaultPermsFor(newStaff.role_template)
                  }
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setNewStaff((p) => ({ ...p, permissions: values }));
                  }}
                  className="h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {permissionGroups.map((g) => (
                          <optgroup key={g.key || g.label} label={g.label}>
                            {(g.perms || []).map((perm) => (
                              <option key={perm.key} value={perm.key}>
                                {perm.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
              </label>
            </div>

            <button
              type="button"
              onClick={createStaff}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Create staff
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Staff</div>
            <p className="mt-1 text-sm text-slate-600">{staff.length} staff account(s)</p>

            <div className="mt-4 space-y-3">
              {staff.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{(s?.full_name || [s?.user?.first_name, s?.user?.last_name].filter(Boolean).join(" ").trim() || s?.user?.email || s?.email || "—")}</div>
                      <div className="mt-1 text-xs text-slate-600">{s?.user?.email || s?.email || "—"}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={s.is_active === false ? "rose" : "green"}>{s.is_active === false ? "Disabled" : "Active"}</Pill>
                      <Pill tone="blue">{s.role_template}</Pill>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block space-y-1">
                      <div className="text-sm font-medium text-slate-700">Permissions</div>
                      <select
                        multiple
                        value={Array.isArray(s.permissions) ? s.permissions : []}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                          updateStaff(s.id, { permissions: values });
                        }}
                        className="h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {permissionGroups.map((g) => (
                          <optgroup key={g.key || g.label} label={g.label}>
                            {(g.perms || []).map((perm) => (
                              <option key={perm.key} value={perm.key}>
                                {perm.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                        <input
                          type="checkbox"
                          checked={s.all_sites !== false}
                          onChange={(e) => updateStaff(s.id, { all_sites: e.target.checked, site_ids: [] })}
                        />
                        Access all sites
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => resetStaffPassword(s.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                          <KeyRound className="h-4 w-4" />
                          Reset password
                        </button>

                        <button
                          type="button"
                          onClick={() => updateStaff(s.id, { is_active: s.is_active === false })}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm ${
                            s.is_active === false
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                          }`}
                        >
                          <Ban className="h-4 w-4" />
                          {s.is_active === false ? "Enable" : "Disable"}
                        </button>
                      </div>

                      <div className="text-xs text-slate-500">
                        Default perms for <b>{s.role_template}</b>: {defaultPermsFor(s.role_template).map(permLabel).join(", ") || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!staff.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  No staff accounts yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "reports" ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Reports & exports</div>
          <p className="mt-1 text-sm text-slate-600">Generate reports for this outreach event.</p>
          <div className="mt-4">
            <Link
              href="/outreach/reports"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <FileDown className="h-4 w-4" />
              Open reports
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
