// app/settings/notifications/page.js
"use client";

import { useEffect, useState } from "react";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notificationPreferences";

function formatLabel(key) {
  // turn "email_appointments" -> "Email appointments"
  if (!key) return "";
  const cleaned = key.replace(/[_\-]+/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchNotificationPreferences();
        if (cancelled) return;

        if (res && typeof res === "object") {
          setPrefs(res);
        } else {
          setPrefs({});
        }
      } catch (err) {
        console.error("Failed to load notification preferences", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load notification preferences. Please try again."
          );
          setPrefs({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleToggle(key) {
    if (!prefs) return;
    const current = !!prefs[key];
    setPrefs({
      ...prefs,
      [key]: !current,
    });
    setSuccess("");
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!prefs) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updated = await updateNotificationPreferences(prefs);

      if (updated && typeof updated === "object") {
        setPrefs(updated);
      }

      setSuccess("Notification preferences updated.");
    } catch (err) {
      console.error("Failed to update notification preferences", err);
      setError(
        err?.message ||
          "Failed to update notification preferences. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const entries = prefs && typeof prefs === "object"
    ? Object.entries(prefs)
    : [];

  const booleanEntries = entries.filter(
    ([, value]) => typeof value === "boolean"
  );
  const otherEntries = entries.filter(
    ([, value]) => typeof value !== "boolean"
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          Notification preferences
        </h1>
        <p className="text-sm text-slate-600">
          Control how you receive notifications about appointments, lab
          results, imaging, billing and general updates.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading && (
          <p className="text-sm text-slate-500">
            Loading your preferences…
          </p>
        )}

        {!loading && !entries.length && !error && (
          <p className="text-sm text-slate-500">
            No notification preferences found for this account.
          </p>
        )}

        {!loading && entries.length > 0 && (
          <form onSubmit={handleSave} className="space-y-6">
            {booleanEntries.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Channels &amp; events
                </h2>
                <div className="space-y-2">
                  {booleanEntries.map(([key, value]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {formatLabel(key)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle(key)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          value
                            ? "bg-blue-600"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            value ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {otherEntries.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Other settings
                </h2>
                <dl className="space-y-1 text-xs text-slate-600">
                  {otherEntries.map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3">
                      <dt className="font-medium">
                        {formatLabel(key)}
                      </dt>
                      <dd className="font-mono text-[11px]">
                        {typeof value === "string"
                          ? value
                          : JSON.stringify(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving || !booleanEntries.length}
                className="inline-flex items-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
