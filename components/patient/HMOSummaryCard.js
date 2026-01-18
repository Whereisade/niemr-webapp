// components/patient/HMOSummaryCard.js - UPDATED FOR NEW HMO SYSTEM
// Supports SystemHMO + HMOTier display
"use client";

import Link from "next/link";
import {
  Shield,
  ChevronRight,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Building2,
  Award,
  TrendingUp,
} from "lucide-react";
import { getTierColors } from "@/lib/hmoStatusColors";

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Check if insurance is expiring soon (within 30 days)
 */
function isExpiringSoon(expiryDate) {
  if (!expiryDate) return false;
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  } catch {
    return false;
  }
}

/**
 * Check if insurance is expired
 */
function isExpired(expiryDate) {
  if (!expiryDate) return false;
  try {
    return new Date(expiryDate) < new Date();
  } catch {
    return false;
  }
}

/**
 * HMO Summary Card for Patient Dashboard
 * 
 * Displays patient's HMO information with tier details and clickable link to details page
 * 
 * @param {Object} patient - Patient object with system_hmo and hmo_tier
 */
export default function HMOSummaryCard({ patient }) {
  if (!patient) {
    return null;
  }

  // Check if patient has HMO using new system_hmo field
  const hasHMO = patient?.insurance_status === "INSURED" && patient?.system_hmo;
  
  if (!hasHMO) {
    // Show self-pay status
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Insurance Status</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-slate-50">
            <CreditCard className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900">Self Pay</p>
          <p className="mt-1 text-xs text-slate-600">
            No HMO coverage active
          </p>
        </div>
      </div>
    );
  }

  const systemHMO = patient.system_hmo;
  const hmoTier = patient.hmo_tier;
  const insuranceNumber = patient.insurance_number || "—";
  const expiryDate = patient.insurance_expiry;
  
  const expiringSoon = isExpiringSoon(expiryDate);
  const expired = isExpired(expiryDate);
  
  // Get tier colors if tier exists
  const tierColors = hmoTier ? getTierColors(hmoTier.level) : null;

  return (
    <Link
      href="/patient/hmo"
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-blue-100"
    >
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">HMO Coverage</h3>
              <p className="text-xs text-emerald-700">Active Insurance</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* HMO Name & Tier */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Provider</span>
          </div>
          <p className="font-semibold text-slate-900">{systemHMO.name}</p>
          
          {/* Tier Badge */}
          {tierColors && hmoTier && (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${tierColors.bgColor} ${tierColors.textColor} ${tierColors.ringColor}`}>
                {tierColors.icon}
                {hmoTier.name}
              </span>
            </div>
          )}
        </div>

        {/* Insurance Details */}
        <div className="space-y-2">
          {/* Insurance Number */}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Insurance #</span>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-900">
              {insuranceNumber}
            </span>
          </div>

          {/* Tier Coverage */}
          {hmoTier?.coverage_percentage !== null && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-600">Coverage</span>
              </div>
              <span className="text-xs font-bold text-emerald-700">
                {hmoTier.coverage_percentage}%
              </span>
            </div>
          )}

          {/* Copay */}
          {hmoTier?.copay_amount && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-600">Copay</span>
              <span className="text-xs font-semibold text-slate-900">
                ₦{Number(hmoTier.copay_amount).toLocaleString()}
              </span>
            </div>
          )}

          {/* Expiry Date */}
          {expiryDate && (
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              expired 
                ? "bg-rose-50" 
                : expiringSoon 
                ? "bg-amber-50" 
                : "bg-slate-50"
            }`}>
              <div className="flex items-center gap-2">
                <Calendar className={`h-3.5 w-3.5 ${
                  expired 
                    ? "text-rose-600" 
                    : expiringSoon 
                    ? "text-amber-600" 
                    : "text-slate-400"
                }`} />
                <span className={`text-xs font-medium ${
                  expired 
                    ? "text-rose-700" 
                    : expiringSoon 
                    ? "text-amber-700" 
                    : "text-slate-600"
                }`}>
                  Expires
                </span>
              </div>
              <span className={`text-xs font-semibold ${
                expired 
                  ? "text-rose-900" 
                  : expiringSoon 
                  ? "text-amber-900" 
                  : "text-slate-900"
              }`}>
                {formatDate(expiryDate)}
              </span>
            </div>
          )}
        </div>

        {/* Status Alerts */}
        {expired && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-rose-900">Coverage Expired</p>
              <p className="mt-0.5 text-xs text-rose-700">
                Please contact your HMO to renew coverage
              </p>
            </div>
          </div>
        )}

        {!expired && expiringSoon && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-900">Expiring Soon</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Coverage expires in {Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
        )}

        {!expired && !expiringSoon && expiryDate && (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Coverage active and valid</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">View full details & benefits</span>
          <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}