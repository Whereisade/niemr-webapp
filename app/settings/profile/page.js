// app/settings/profile/page.js
"use client";

import { useEffect, useState } from "react";
import {
  fetchAccountProfile,
  updateAccountProfile,
} from "@/lib/accountProfile";

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
        setSuccess("");

        const res = await fetchAccountProfile();
        if (cancelled) return;

        setProfile(res || {});
        setFirstName((res?.first_name || "").trim());
        setLastName((res?.last_name || "").trim());
      } catch (err) {
        console.error("Failed to load account profile", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load your profile. Please try again."
          );
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };

      const updated = await updateAccountProfile(payload);

      setProfile(updated || { ...profile, ...payload });
      setSuccess("Profile updated successfully.");
    } catch (err) {
      console.error("Failed to update account profile", err);
      setError(
        err?.message ||
          "Failed to update your profile. Please check the fields and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const email = profile?.email || "";
  const role = profile?.role || profile?.user_role || "";
  const facilityName =
    profile?.facility?.name ||
    profile?.facility_name ||
    "";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          Account profile
        </h1>
        <p className="text-sm text-slate-600">
          Update your name and review the account details linked to
          this login.
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
            Loading your profile…
          </p>
        )}

        {!loading && (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 text-sm text-slate-800"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setSuccess("");
                    setError("");
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setSuccess("");
                    setError("");
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Email address is managed by the system and cannot be
                  changed here.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={role || "—"}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
                {facilityName && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Facility: <span className="font-medium">{facilityName}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving}
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
