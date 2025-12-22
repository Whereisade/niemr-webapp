"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function FacilityAnnouncementsPanel() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [announcements, setAnnouncements] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [actionUrl, setActionUrl] = useState("");
  const [audienceRoles, setAudienceRoles] = useState(["FRONTDESK", "NURSE", "DOCTOR"]);

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
      // ignore
    } finally {
      setLoadingMe(false);
    }
  }

  async function loadAnnouncements() {
    setLoadingList(true);
    try {
      const res = await fetchAnnouncements({ active: true, current: true, limit: 20 });
      setAnnouncements(normalizeList(res));
    } catch (e) {
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

    setSubmitting(true);
    try {
      await createAnnouncement(payload);
      setTitle("");
      setBody("");
      setActionUrl("");
      setPriority("NORMAL");
      setFlash({ type: "success", message: "Announcement sent." });
      await loadAnnouncements();
    } catch (err) {
      setFlash({ type: "error", message: err?.message || "Failed to send announcement." });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  return (
    <div className="mb-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Facility Announcements</h2>
            {/* <p className="text-sm text-gray-600">
              Broadcast important updates to role-scoped channels (frontdesk, nurses, doctors, etc.).
            </p> */}
          </div>
        </div>

        {/* Composer */}
        {!loadingMe && canBroadcast ? (
          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            {flash ? (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  flash.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {flash.message}
              </div>
            ) : null}

            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System downtime tonight"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the announcement..."
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 grid gap-2">
                <label className="text-sm font-medium">Action URL (optional)</label>
                <input
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="e.g. /facility/appointments"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500">Used when clicking the notification.</p>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Audience (role-scoped channels)</label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => toggleRole(r.value)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      audienceRoles.includes(r.value)
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Leave roles unchecked to target all facility staff.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={loadAnnouncements}
                className="rounded-lg border px-4 py-2 text-sm"
                disabled={submitting}
              >
                Refresh
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send Announcement"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            Only the admins/frontdesk will broadcast announcements.
          </div>
        )}

        {/* Recent announcements */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Recent announcements</h3>
            <button
              onClick={loadAnnouncements}
              className="text-sm text-blue-700 hover:underline"
              type="button"
            >
              Reload
            </button>
          </div>
          <div className="mt-2 grid gap-2">
            {loadingList ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : announcements.length === 0 ? (
              <div className="text-sm text-gray-600">No announcements yet.</div>
            ) : (
              announcements.slice(0, 10).map((a) => (
                <div key={a.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">{a.title}</div>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {a.priority}
                        </span>
                      </div>
                      {a.body ? (
                        <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{a.body}</div>
                      ) : null}
                      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                        <span>
                          Audience: {Array.isArray(a.audience_roles) && a.audience_roles.length ? a.audience_roles.join(", ") : "ALL"}
                        </span>
                        <span>•</span>
                        <span>{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</span>
                      </div>
                    </div>
                    {a.action_url ? (
                      <a
                        href={a.action_url}
                        className="text-sm text-blue-700 hover:underline whitespace-nowrap"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
