"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  OUTREACH_MODULES,
  OUTREACH_ROLE_TEMPLATES,
  OUTREACH_ROLE_DEFAULTS,
  filterPermissionGroupsByModules,
} from "@/lib/outreachConfig";
import { useOutreachSession } from "@/lib/useOutreachSession";
import { CalendarPlus, ArrowLeft, Plus, Trash2, Save, CheckCircle2, Shield } from "lucide-react";

function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </div>
      {children}
    </label>
  );
}

export default function OutreachNewEventPage() {
  const router = useRouter();
  const { isOutreachSuperAdmin } = useOutreachSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [modulesEnabled, setModulesEnabled] = useState({
    vitals: true,
    lab: true,
    pharmacy: true,
    immunization: false,
    blood_donation: false,
    encounter: true,
    counseling: false,
    maternal: false,
  });

  const [sites, setSites] = useState([
    { name: "Main site", community: "", address: "" },
  ]);

  const [staff, setStaff] = useState([
    { email: "", full_name: "", role_template: "CLINICIAN", all_sites: true, site_ids: [], permissions: null },
  ]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [createdStaff, setCreatedStaff] = useState([]); // {email, password, profileId}
  const [createdEventId, setCreatedEventId] = useState(null);
  const permissionGroups = useMemo(
    () => filterPermissionGroupsByModules(modulesEnabled || {}),
    [modulesEnabled]
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

  function toggleModule(key) {
    setModulesEnabled((p) => ({ ...p, [key]: !p[key] }));
  }

  function addSite() {
    setSites((p) => [...p, { name: "", community: "", address: "" }]);
  }

  function removeSite(idx) {
    setSites((p) => p.filter((_, i) => i !== idx));
  }

  function updateSite(idx, patch) {
    setSites((p) => p.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addStaff() {
    setStaff((p) => [
      ...p,
      { email: "", full_name: "", role_template: "CLINICIAN", all_sites: true, site_ids: [], permissions: null },
    ]);
  }

  function removeStaff(idx) {
    setStaff((p) => p.filter((_, i) => i !== idx));
  }

  function updateStaff(idx, patch) {
    setStaff((p) => p.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function defaultPermsFor(role) {
    return OUTREACH_ROLE_DEFAULTS[role] ? [...OUTREACH_ROLE_DEFAULTS[role]] : [];
  }

  async function createAll(e) {
    e.preventDefault();
    setErr("");
    setCreatedStaff([]);

    if (!title.trim()) {
      setErr("Title is required.");
      return;
    }

    setBusy(true);
    try {
      // 1) Create event
      const evt = await apiFetch("/outreach/events/", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          modules_enabled: modulesEnabled,
        }),
      });

      setCreatedEventId(evt?.id || null);

      // 2) Create sites under event
      const createdSites = [];
      for (const s of sites.filter((x) => x?.name?.trim())) {
        const cs = await apiFetch(`/outreach/events/${evt.id}/sites/`, {
          method: "POST",
          body: JSON.stringify({
            name: s.name.trim(),
            community: s.community?.trim() || "",
            address: s.address?.trim() || "",
          }),
        });
        createdSites.push(cs);
      }

      // 3) Create staff under event
      const credentials = [];
      for (const st of staff.filter((x) => x?.email?.trim())) {
        const role = st.role_template || "CLINICIAN";
        const perms =
          Array.isArray(st.permissions) && st.permissions.length
            ? st.permissions
            : defaultPermsFor(role);

        const payload = {
          email: st.email.trim(),
          full_name: st.full_name?.trim() || st.email.trim(),
          role_template: role,
          permissions: perms,
          all_sites: !!st.all_sites,
          site_ids: st.all_sites ? [] : (st.site_ids || []).map(Number),
        };

        const created = await apiFetch(`/outreach/events/${evt.id}/staff/`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        credentials.push({
          email: created?.credentials?.email || st.email,
          password: created?.credentials?.password,
          profile_id: created?.profile_id || created?.id,
        });
      }

      setCreatedStaff(credentials);

      // If no staff were created, just go to event page
      if (!credentials.length) {
        router.push(`/outreach/events/${evt.id}`);
      }
    } catch (e2) {
      setErr(e2?.message || "Failed to create outreach event.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOutreachSuperAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">Not available</div>
        <p className="mt-1 text-sm text-slate-600">Only Outreach Super Admin can create outreach events.</p>
        <div className="mt-4">
          <Link href="/outreach/events" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to events →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/outreach/events"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New outreach event</h1>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{err}</div>
      ) : null}

      <form onSubmit={createAll} className="space-y-6">
        {/* Event details */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 text-blue-700">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">Event details</div>
              <p className="text-sm text-slate-600">Basic info and schedule.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Title *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Ofa Community Outreach"
              />
            </Field>

            <Field label="Starts at" hint="Optional">
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </Field>

            <Field label="Ends at" hint="Optional">
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </Field>

            <Field label="Description" hint="Optional">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[90px] w-full rounded-xl border border-slate-200 p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Brief context for the outreach…"
              />
            </Field>
          </div>
        </div>

        {/* Modules */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 text-blue-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">Activated modules</div>
              <p className="text-sm text-slate-600">Turn on only what you’ll use at the outreach.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(OUTREACH_MODULES).map((m) => (
              <label key={m.key} className="flex items-start gap-2 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={!!modulesEnabled[m.key]}
                  onChange={() => toggleModule(m.key)}
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

        {/* Sites */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">Sites</div>
              <p className="text-sm text-slate-600">Optional locations or stations for the outreach.</p>
            </div>
            <button
              type="button"
              onClick={addSite}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add site
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {sites.map((s, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">Site #{idx + 1}</div>
                  {sites.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeSite(idx)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Field label="Name *">
                    <input
                      value={s.name}
                      onChange={(e) => updateSite(idx, { name: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="e.g. Station A"
                    />
                  </Field>
                  <Field label="Community">
                    <input
                      value={s.community}
                      onChange={(e) => updateSite(idx, { community: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Optional"
                    />
                  </Field>
                  <Field label="Address">
                    <input
                      value={s.address}
                      onChange={(e) => updateSite(idx, { address: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">Staff accounts</div>
              <p className="text-sm text-slate-600">
                Create temporary logins for the outreach. Passwords will be generated.
              </p>
            </div>
            <button
              type="button"
              onClick={addStaff}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add staff
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {staff.map((st, idx) => {
              const defaults = defaultPermsFor(st.role_template);
              const perms = Array.isArray(st.permissions) ? st.permissions : defaults;

              return (
                <div key={idx} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">Staff #{idx + 1}</div>
                    {staff.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeStaff(idx)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Field label="Email *">
                      <input
                        value={st.email}
                        onChange={(e) => updateStaff(idx, { email: e.target.value })}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="name@example.com"
                      />
                    </Field>
                    <Field label="Full name">
                      <input
                        value={st.full_name}
                        onChange={(e) => updateStaff(idx, { full_name: e.target.value })}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Optional"
                      />
                    </Field>
                    <Field label="Role template">
                      <select
                        value={st.role_template}
                        onChange={(e) => updateStaff(idx, { role_template: e.target.value, permissions: null })}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {OUTREACH_ROLE_TEMPLATES.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={!!st.all_sites}
                        onChange={(e) => updateStaff(idx, { all_sites: e.target.checked, site_ids: [] })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-slate-900">Access all sites</div>
                        <div className="text-xs text-slate-600">If off, choose specific site IDs later.</div>
                      </div>
                    </label>

                    <Field label="Custom permissions (optional)" hint="If empty, role defaults are used">
                      <select
                        multiple
                        value={perms}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                          updateStaff(idx, { permissions: values });
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
                    </Field>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    Default permissions for <b>{st.role_template}</b>: {defaults.map(permLabel).join(", ") || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            Staff accounts will be created with temporary passwords. You can reset or close access later.
          </div>
          <button
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {busy ? "Creating…" : "Create outreach"}
          </button>
        </div>

        {createdStaff.length ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Staff credentials created
            </div>
            {createdEventId ? (
              <div className="mt-2">
                <Link
                  href={`/outreach/events/${createdEventId}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
                >
                  Continue to event
                </Link>
              </div>
            ) : null}
            <div className="mt-2 space-y-1">
              {createdStaff.map((c, i) => (
                <div key={i} className="font-mono text-xs">
                  {c.email} → {c.password || "(no password returned)"}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
