// components/patient/HMOSummaryCard.js - FIXED VERSION
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
} from "lucide-react";
import { getHMOStatusColors } from "@/lib/hmoStatusColors";

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
 * Displays patient's HMO information with clickable link to details page
 */
export default function HMOSummaryCard({ patient }) {
  // 🔧 FIXED: Add null check for patient
  if (!patient) {
    return null;
  }

  // Check if patient has HMO
  const hasHMO = patient?.insurance_status === "INSURED" && patient?.hmo;
  
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

  const hmo = patient.hmo;
  const insuranceNumber = patient.insurance_number || "—";
  const plan = patient.hmo_plan || "Standard Plan";
  const expiryDate = patient.insurance_expiry;
  
  const expiringSoon = isExpiringSoon(expiryDate);
  const expired = isExpired(expiryDate);
  
  // Get relationship status colors
  const statusColors = hmo.relationship_status 
    ? getHMOStatusColors(hmo.relationship_status)
    : null;

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
        {/* HMO Name */}
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Provider</span>
          </div>
          <p className="mt-1 font-semibold text-slate-900">{hmo.name}</p>
          {statusColors && (
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusColors.bgColor} ${statusColors.textColor} ${statusColors.ringColor}`}>
              {statusColors.label} Partnership
            </span>
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

          {/* Plan */}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-xs font-medium text-slate-600">Plan</span>
            <span className="text-xs font-semibold text-slate-900">{plan}</span>
          </div>

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
          <span className="text-xs font-medium text-slate-600">View full details</span>
          <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}