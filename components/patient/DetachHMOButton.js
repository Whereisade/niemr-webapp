// components/patient/DetachHMOButton.js - UPDATED FOR NEW HMO SYSTEM
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, Loader2, Shield } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * Button to allow patients to detach from their HMO
 * Shows confirmation dialog before proceeding
 * 
 * Updated to work with SystemHMO + FacilityHMO architecture
 * 
 * @param {number} patientId - Patient ID
 * @param {string} hmoName - HMO name for display
 * @param {string} tierName - Optional tier name for display
 */
export default function DetachHMOButton({ patientId, hmoName, tierName }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDetaching, setIsDetaching] = useState(false);
  const [error, setError] = useState(null);

  const handleDetach = async () => {
    setIsDetaching(true);
    setError(null);

    try {
      // Use the new detach endpoint that clears system_hmo and hmo_tier
      await apiFetch(`/patients/${patientId}/detach-hmo/`, {
        method: "POST",
      });

      // Success! Redirect to dashboard with success message
      router.push("/patient?detached=true");
      router.refresh();
    } catch (err) {
      console.error("Failed to detach HMO:", err);
      setError(err.message || "Failed to detach from HMO. Please try again.");
      setIsDetaching(false);
    }
  };

  return (
    <>
      {/* Detach Button */}
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
      >
        <X className="h-4 w-4" />
        Cancel HMO Coverage
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-rose-100">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-rose-900">
                    Cancel HMO Coverage?
                  </h3>
                  <p className="mt-1 text-sm text-rose-700">
                    This action will remove your insurance coverage
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Current Coverage Info */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-700">Current Coverage</span>
                </div>
                <p className="text-sm font-bold text-slate-900">{hmoName}</p>
                {tierName && (
                  <p className="text-xs text-slate-600 mt-1">{tierName}</p>
                )}
              </div>

              {/* What Will Happen */}
              <div className="rounded-lg bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                  What will happen:
                </h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-rose-600">•</span>
                    <span>
                      Your HMO coverage with <strong>{hmoName}</strong> will be
                      removed
                    </span>
                  </li>
                  {tierName && (
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-rose-600">•</span>
                      <span>
                        Your <strong>{tierName}</strong> benefits will be deactivated
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-rose-600">•</span>
                    <span>
                      Your payment status will change to{" "}
                      <strong>Self Pay</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-rose-600">•</span>
                    <span>
                      You will be responsible for all medical bills directly
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-rose-600">•</span>
                    <span>
                      You can re-attach HMO coverage later by contacting the
                      facility
                    </span>
                  </li>
                </ul>
              </div>

              {/* Error Display */}
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-600" />
                    <div>
                      <p className="text-sm font-semibold text-rose-900">
                        Error
                      </p>
                      <p className="mt-1 text-sm text-rose-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning Note */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs text-amber-900">
                  <strong>Important:</strong> If you have active appointments or
                  ongoing treatments, removing your HMO coverage may affect your
                  billing. Any tier-specific benefits will no longer apply. Please 
                  consult with the facility before proceeding.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 p-6">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setError(null);
                  }}
                  disabled={isDetaching}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Keep Coverage
                </button>
                <button
                  onClick={handleDetach}
                  disabled={isDetaching}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/25 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDetaching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Yes, Remove Coverage
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}