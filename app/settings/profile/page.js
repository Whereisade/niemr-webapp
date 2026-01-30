// app/settings/profile/page.js
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAccountProfile, changeAccountPassword } from "@/lib/accountProfile";
import { fetchVisibilitySettings, updateVisibilitySettings } from "@/lib/visibility";

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Visibility toggle state
  const [visibilitySettings, setVisibilitySettings] = useState(null);
  const [isPubliclyVisible, setIsPubliclyVisible] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState("");
  const [visibilitySuccess, setVisibilitySuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setPasswordError("");
        setPasswordSuccess("");
        setVisibilityError("");
        setVisibilitySuccess("");

        const res = await fetchAccountProfile();
        if (cancelled) return;

        setProfile(res || {});

        // Load visibility settings (only for non-patients)
        if (res?.role !== "PATIENT") {
          try {
            const visSettings = await fetchVisibilitySettings();
            if (!cancelled) {
              setVisibilitySettings(visSettings);
              setIsPubliclyVisible(visSettings?.is_publicly_visible ?? true);
            }
          } catch (err) {
            // Visibility settings not available for this user type
            console.log("Visibility settings not available:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load account profile", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load your profile. Please try again.");
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

  async function handlePasswordSubmit(e) {
    e.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    const cur = currentPassword;
    const next = newPassword;
    const confirm = confirmPassword;

    if (!cur || !next || !confirm) {
      setPasswordError("Please fill all password fields.");
      return;
    }
    if (next.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (cur === next) {
      setPasswordError("New password must be different from your current password.");
      return;
    }

    try {
      setSavingPassword(true);
      const res = await changeAccountPassword({
        current_password: cur,
        new_password: next,
        confirm_password: confirm,
      });

      setPasswordSuccess(res?.detail || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Failed to change password", err);
      setPasswordError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleVisibilityToggle() {
    try {
      setSavingVisibility(true);
      setVisibilityError("");
      setVisibilitySuccess("");

      const newVisibility = !isPubliclyVisible;
      const result = await updateVisibilitySettings(newVisibility);

      setIsPubliclyVisible(result.is_publicly_visible);
      setVisibilitySuccess(result.message || "Visibility updated successfully.");
      setTimeout(() => setVisibilitySuccess(""), 3000);
    } catch (err) {
      console.error("Failed to update visibility", err);
      setVisibilityError(err?.message || "Failed to update visibility. Please try again.");
    } finally {
      setSavingVisibility(false);
    }
  }

  const email = profile?.email || "";
  const role = profile?.role || profile?.user_role || "";
  const facilityName = profile?.facility?.name || profile?.facility_name || "";
  const displayName = [profile?.first_name, profile?.last_name]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .join(" ") || "—";

  const showVisibilityToggle = visibilitySettings !== null && role !== "PATIENT";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          Account profile
        </h1>
        <p className="text-sm text-slate-600">
          Review your account details and manage your security settings.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Profile Details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading your profile…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-600">Name</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {displayName}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Name is managed by the system. If it needs correction, contact your admin.
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600">Email</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {email || "—"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Email address is managed by the system and cannot be changed here.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-600">Role</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {role || "—"}
                </p>
                {facilityName && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Facility: <span className="font-medium">{facilityName}</span>
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600">Account</p>
                <p className="mt-1 text-sm text-slate-700">
                  Logged in and active
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Password Reset / Change */}
      {!loading && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Security</h2>
              <p className="mt-1 text-sm text-slate-600">
                Reset your password for this account.
              </p>
            </div>

            {passwordError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordError("");
                    setPasswordSuccess("");
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Use at least 8 characters.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-500">
                  Forgot your current password?{" "}
                  <Link href="/forgot-password" className="text-blue-600 hover:underline">
                    Send reset link
                  </Link>
                </p>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingPassword ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Visibility Toggle Section - Only for facilities and providers */}
      {!loading && showVisibilityToggle && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Public Visibility</h2>
              <p className="mt-1 text-sm text-slate-600">
                Control whether your {visibilitySettings.entity_type === "facility" ? "facility" : "practice"} appears in public search results and can accept online bookings.
              </p>
            </div>

            {visibilityError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {visibilityError}
              </div>
            )}
            {visibilitySuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {visibilitySuccess}
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {isPubliclyVisible ? "Publicly Visible" : "Hidden from Public"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      isPubliclyVisible
                        ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                        : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                    }`}
                  >
                    {isPubliclyVisible ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {isPubliclyVisible
                    ? `Your ${visibilitySettings.entity_type === "facility" ? "facility" : "practice"} is visible to patients searching for healthcare providers and can accept online bookings.`
                    : `Your ${visibilitySettings.entity_type === "facility" ? "facility" : "practice"} is hidden from public search. Only walk-in patients or those with direct referrals can book appointments.`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleVisibilityToggle}
                disabled={savingVisibility}
                className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPubliclyVisible ? "bg-blue-600" : "bg-slate-200"
                }`}
                role="switch"
                aria-checked={isPubliclyVisible}
              >
                <span className="sr-only">Toggle public visibility</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPubliclyVisible ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="flex gap-2">
                <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-blue-900">About visibility settings</h3>
                  <p className="mt-1 text-xs text-blue-800">
                    {visibilitySettings.entity_type === "facility"
                      ? "When hidden, your facility won't appear in patient searches on the platform. Existing patients can still access your services, but new patients will need a direct referral or contact to find you."
                      : "When hidden, you won't appear in provider searches on the platform. This is useful if you only accept walk-in patients or referrals, or if you're temporarily not accepting new patients."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
