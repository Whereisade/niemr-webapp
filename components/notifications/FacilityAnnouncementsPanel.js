"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Loader2, RefreshCw, Link as LinkIcon, AlertCircle } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { createAnnouncement, fetchAnnouncements } from "@/lib/notifications";

const BROADCAST_ROLES = ["SUPER_ADMIN", "ADMIN", "FRONTDESK"];

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "FRONTDESK", label: "Frontdesk" },
  { value: "NURSE", label: "Nurse" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "LAB", label: "Lab" },
  { value: "PHARMACY", label: "Pharmacy" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

function normalizeList(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.items)) return res.items;
  if (typeof res === "object") {
    // Sometimes DRF arrays get spread into numeric-key objects.
    const numeric = Object.keys(res)
      .filter((k) => /^\d+$/.test(k))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => res[k]);
    if (numeric.length) return numeric;
  }
  return [];
}

function priorityBadgeClasses(priority) {
  switch ((priority || "").toUpperCase()) {
    case "URGENT":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "HIGH":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "LOW":
      return "bg-slate-50 text-slate-700 border-slate-200";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

export default function FacilityAnnouncementsPanel() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [announcements, setAnnouncements] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [actionUrl, setActionUrl] = useState("");
  const [audienceRoles, setAudienceRoles] = useState([
    "FRONTDESK",
    "NURSE",
    "DOCTOR",
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(null);

  const canBroadcast = useMemo(() => {
    const role = (me?.role || "").toUpperCase();
    return BROADCAST_ROLES.includes(role);
  }, [me]);

  async function loadMe() {
    setLoadingMe(true);
    try {
      const data = await apiFetch("/accounts/me/", { method: "GET" });
      setMe(data);
    } catch (e) {
      console.error("Failed to load user profile:", e);
    } finally {
      setLoadingMe(false);
    }
  }

  async function loadAnnouncements() {
    setLoadingList(true);
    setListError(null);
    try {
      console.log("Fetching announcements with params:", {
        active: true,
        current: true,
        limit: 20,
      });
      
      const res = await fetchAnnouncements({
        active: true,
        current: true,
        limit: 20,
      });
      
      console.log("Announcements API response:", res);
      
      const normalized = normalizeList(res);
      console.log("Normalized announcements:", normalized);
      
      setAnnouncements(normalized);
    } catch (e) {
      console.error("Failed to load announcements:", e);
      setListError(e?.message || "Failed to load announcements");
      setAnnouncements([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadMe();
    loadAnnouncements();
  }, []);

  function toggleRole(roleValue) {
    setAudienceRoles((prev) => {
      if (prev.includes(roleValue)) return prev.filter((r) => r !== roleValue);
      return [...prev, roleValue];
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFlash(null);

    const cleanTitle = (title || "").trim();
    const cleanBody = (body || "").trim();

    if (!cleanTitle) {
      setFlash({ type: "error", message: "Title is required." });
      return;
    }

    // roles optional: empty means all staff in backend
    const payload = {
      title: cleanTitle,
      body: cleanBody,
      priority,
      action_url: (actionUrl || "").trim(),
      audience_roles: audienceRoles,
    };

    console.log("Creating announcement with payload:", payload);

    setSubmitting(true);
    try {
      const result = await createAnnouncement(payload);
      console.log("Announcement created successfully:", result);
      
      setTitle("");
      setBody("");
      setActionUrl("");
      setPriority("NORMAL");
      setFlash({ type: "success", message: "Announcement sent successfully." });
      
      // Reload announcements to show the new one
      await loadAnnouncements();
    } catch (err) {
      console.error("Failed to create announcement:", err);
      setFlash({
        type: "error",
        message: err?.message || "Failed to send announcement.",
      });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  const totalAnnouncements = announcements.length;
  const latestAnnouncement = announcements[0];

  return (
    <section className="mb-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
        {/* Soft gradient flair */}
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-emerald-500/15 blur-3xl" />
        {/* Top strip */}
        <div className="relative h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        <div className="relative p-5 md:p-6 space-y-6">
          {/* Header + stats */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10 text-blue-700">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Facility announcements
                </h2>
                <p className="mt-1 text-xs text-slate-600 md:text-sm">
                  Broadcast important updates to role-scoped channels
                  (frontdesk, nurses, doctors, lab, pharmacy) so operations
                  stay in sync.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-right text-[11px] text-slate-500">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <div className="font-medium text-slate-500">
                  Active messages
                </div>
                <div className="mt-0.5 text-lg font-semibold text-slate-900">
                  {loadingList ? "…" : totalAnnouncements}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <div className="font-medium text-slate-500">
                  Last priority
                </div>
                <div className="mt-0.5 text-xs font-semibold text-slate-900">
                  {latestAnnouncement?.priority || "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <div className="font-medium text-slate-500">Role</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-900">
                  {loadingMe
                    ? "Checking…"
                    : me?.role || "Not available"}
                </div>
              </div>
            </div>
          </div>

          {/* Composer / permission info */}
          {!loadingMe && canBroadcast ? (
            <form
              onSubmit={onSubmit}
              className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 md:px-5 md:py-5"
            >
              {flash && (
                <div
                  className={`mb-2 rounded-2xl px-4 py-3 text-sm ${
                    flash.type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {flash.message}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-700">
                      Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. System downtime tonight"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-700">
                      Message
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write the announcement…"
                      rows={3}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-700">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-1">
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-700">
                        Action URL (optional)
                      </label>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3 py-1.5">
                        <LinkIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <input
                          value={actionUrl}
                          onChange={(e) => setActionUrl(e.target.value)}
                          placeholder="e.g. /facility/appointments"
                          className="h-7 w-full border-none bg-transparent text-sm text-slate-900 outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Users are taken here when they open the notification.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-700">
                      Audience (role-scoped channels)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((r) => {
                        const active = audienceRoles.includes(r.value);
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => toggleRole(r.value)}
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              active
                                ? "border-blue-200 bg-blue-50 text-blue-800"
                                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/70"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Leave all roles unchecked to target{" "}
                      <span className="font-semibold">all facility staff</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={loadAnnouncements}
                  className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  disabled={submitting}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh list
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-4 w-4" />
                      Send announcement
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
              Only{" "}
              <span className="font-semibold">Super Admin, Admin,</span> and{" "}
              <span className="font-semibold">Frontdesk</span> users can
              broadcast facility-wide announcements. You&apos;ll still see
              announcements addressed to your role below.
            </div>
          )}

          {/* Recent announcements */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                Recent announcements
              </h3>
              <button
                onClick={loadAnnouncements}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                type="button"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload
              </button>
            </div>

            {/* Error state */}
            {listError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">Failed to load announcements</p>
                  <p className="text-xs mt-1">{listError}</p>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              {loadingList ? (
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span>Loading announcements…</span>
                </div>
              ) : announcements.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-sm text-slate-500">
                  No announcements yet. When admins or frontdesk post messages,
                  they will appear here.
                </div>
              ) : (
                announcements.slice(0, 10).map((a) => (
                  <article
                    key={a.id}
                    className="rounded-2xl border border-slate-100 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {a.title}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${priorityBadgeClasses(
                              a.priority
                            )}`}
                          >
                            {a.priority || "NORMAL"}
                          </span>
                        </div>
                        {a.body ? (
                          <p className="whitespace-pre-wrap text-sm text-slate-700">
                            {a.body}
                          </p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>
                            Audience:{" "}
                            {Array.isArray(a.audience_roles) &&
                            a.audience_roles.length
                              ? a.audience_roles.join(", ")
                              : "ALL"}
                          </span>
                          {a.created_at && <span>•</span>}
                          {a.created_at && (
                            <span>
                              {new Date(
                                a.created_at
                              ).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {a.action_url ? (
                        <a
                          href={a.action_url}
                          className="ml-2 inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}