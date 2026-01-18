// app/patient/hmo/page.js - UPDATED FOR NEW HMO SYSTEM
// Supports SystemHMO + FacilityHMO + HMOTier architecture
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Shield,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Heart,
  Clock,
  Award,
  Star,
  TrendingUp,
  Info,
} from "lucide-react";
import { getHMOStatusColors, getTierColors } from "@/lib/hmoStatusColors";
import DetachHMOButton from "@/components/patient/DetachHMOButton";

const BACKEND = process.env.NIEMR_BACKEND_URL || "http://localhost:8000";
const ACCESS_COOKIE = process.env.ACCESS_COOKIE || "niemr_access";

async function fetchMe() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND}/api/accounts/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchPatientProfile(token) {
  if (!token) return null;
  
  try {
    // Fetch patient data with expanded HMO fields
    const res = await fetch(`${BACKEND}/api/patients/`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      },
      cache: "no-store",
    });
    
    if (!res.ok) {
      console.error("Failed to fetch patient profile:", res.status);
      return null;
    }
    
    const data = await res.json();
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data[0] || null;
    }
    
    if (data?.results && Array.isArray(data.results)) {
      return data.results[0] || null;
    }
    
    return null;
  } catch (err) {
    console.error("Error fetching patient profile:", err);
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

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

function isExpired(expiryDate) {
  if (!expiryDate) return false;
  try {
    return new Date(expiryDate) < new Date();
  } catch {
    return false;
  }
}

export default async function PatientHMOPage() {
  const me = await fetchMe();
  
  if (!me) {
    redirect("/login/patient");
  }

  if (me.role !== "PATIENT") {
    redirect("/login/patient");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  
  const patient = await fetchPatientProfile(token);

  if (!patient) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/patient"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-amber-600" />
              <div>
                <h2 className="text-xl font-bold text-amber-900">Unable to Load Patient Profile</h2>
                <p className="mt-2 text-sm text-amber-700">
                  We couldn't load your patient profile at this time. Please try refreshing the page or contact support if the issue persists.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/patient"
                    className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Check for HMO using the new system_hmo field
  const hasHMO = patient.insurance_status === "INSURED" && patient.system_hmo;

  if (!hasHMO) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/patient"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100">
                  <Shield className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Insurance Coverage</h1>
                  <p className="text-sm text-slate-600">HMO information and coverage details</p>
                </div>
              </div>
            </div>

            <div className="p-12 text-center">
              <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-slate-50">
                <CreditCard className="h-10 w-10 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">No HMO Coverage</h2>
              <p className="mt-2 text-sm text-slate-600">
                You are currently on a self-pay plan with no HMO coverage active.
              </p>
              <p className="mt-4 text-sm text-slate-600">
                If you have HMO coverage, please contact the facility's front desk to update your insurance information.
              </p>
              <div className="mt-6">
                <Link
                  href="/patient"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Extract HMO and tier data
  const systemHMO = patient.system_hmo;
  const hmoTier = patient.hmo_tier;
  const insuranceNumber = patient.insurance_number || "Not provided";
  const expiryDate = patient.insurance_expiry;
  const enrolledAt = patient.hmo_enrolled_at;
  const notes = patient.insurance_notes;
  
  const expiringSoon = isExpiringSoon(expiryDate);
  const expired = isExpired(expiryDate);
  
  // Get tier colors
  const tierColors = hmoTier ? getTierColors(hmoTier.level) : null;

  // Get addresses and contact from facility-specific or system-wide data
  const primaryAddress = systemHMO.primary_address || (systemHMO.addresses && systemHMO.addresses[0]) || "Not provided";
  const primaryContact = systemHMO.primary_contact || (systemHMO.contact_numbers && systemHMO.contact_numbers[0]) || "Not provided";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Back Button */}
        <Link
          href="/patient"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header with Action Buttons */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25">
                <Shield className="h-3.5 w-3.5" />
                <span>HMO Coverage</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
                Insurance Details
              </h1>
              <p className="mt-2 text-base text-slate-600">
                Your health maintenance organization coverage and benefits
              </p>
            </div>
            
            {/* Detach Button */}
            <div className="flex-shrink-0">
              <DetachHMOButton 
                patientId={patient.id} 
                hmoName={systemHMO.name} 
              />
            </div>
          </div>
        </div>

        {/* Status Alert */}
        {expired && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-rose-100">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-rose-900">Coverage Expired</h3>
                <p className="mt-1 text-sm text-rose-700">
                  Your insurance coverage expired on {formatDate(expiryDate)}. Please contact {systemHMO.name} or the facility to renew your coverage.
                </p>
              </div>
            </div>
          </div>
        )}

        {!expired && expiringSoon && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Coverage Expiring Soon</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your insurance coverage expires on {formatDate(expiryDate)} ({Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days). Please renew before expiry to avoid interruption in coverage.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* HMO Provider Information */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">HMO Provider</h2>
                    <p className="text-xs text-slate-600">Insurance provider details</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Provider Name</label>
                  <p className="mt-1 text-lg font-bold text-slate-900">{systemHMO.name}</p>
                </div>

                {systemHMO.nhis_number && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">NHIS Registration</label>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{systemHMO.nhis_number}</p>
                  </div>
                )}

                {systemHMO.email && (
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-slate-600">Email</label>
                      <a href={`mailto:${systemHMO.email}`} className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                        {systemHMO.email}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <Phone className="h-5 w-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-medium text-slate-600">Primary Contact</label>
                    <a href={`tel:${primaryContact}`} className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                      {primaryContact}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-medium text-slate-600">Primary Address</label>
                    <p className="text-sm text-slate-900">{primaryAddress}</p>
                  </div>
                </div>

                {systemHMO.contact_person_name && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600">Contact Person</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
                        <User className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{systemHMO.contact_person_name}</p>
                        </div>
                      </div>
                      {systemHMO.contact_person_phone && (
                        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                          <Phone className="h-5 w-5 text-slate-400" />
                          <a href={`tel:${systemHMO.contact_person_phone}`} className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                            {systemHMO.contact_person_phone}
                          </a>
                        </div>
                      )}
                      {systemHMO.contact_person_email && (
                        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                          <Mail className="h-5 w-5 text-slate-400" />
                          <a href={`mailto:${systemHMO.contact_person_email}`} className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                            {systemHMO.contact_person_email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tier Benefits Card */}
            {hmoTier && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className={`border-b ${tierColors.borderColor} ${tierColors.bgColor} p-5`}>
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${tierColors.iconBg}`}>
                      <Award className={`h-5 w-5 ${tierColors.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Coverage Tier</h2>
                      <p className="text-xs text-slate-600">Your plan benefits and coverage</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Tier Badge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Current Tier</label>
                      <div className="mt-2 inline-flex items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-2 ${tierColors.bgColor} ${tierColors.textColor} ${tierColors.ringColor}`}>
                          {tierColors.icon}
                          {hmoTier.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tier Details */}
                  {hmoTier.description && (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Plan Description</label>
                      <p className="mt-1 text-sm text-slate-700">{hmoTier.description}</p>
                    </div>
                  )}

                  {/* Coverage Percentage */}
                  {hmoTier.coverage_percentage !== null && (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Coverage</label>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-slate-900">{hmoTier.coverage_percentage}%</span>
                          <span className="text-xs text-slate-600">HMO covers</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className={`h-full ${tierColors.progressBg}`}
                            style={{ width: `${hmoTier.coverage_percentage}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                          You pay {100 - hmoTier.coverage_percentage}% of covered services
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Copay Amount */}
                  {hmoTier.copay_amount && (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Copay per Visit</label>
                      <p className="mt-1 text-lg font-bold text-slate-900">₦{Number(hmoTier.copay_amount).toLocaleString()}</p>
                    </div>
                  )}

                  {/* Annual Limit */}
                  {hmoTier.annual_limit && (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Annual Coverage Limit</label>
                      <p className="mt-1 text-lg font-bold text-slate-900">₦{Number(hmoTier.annual_limit).toLocaleString()}</p>
                    </div>
                  )}

                  {/* Benefits */}
                  {hmoTier.benefits && hmoTier.benefits.length > 0 && (
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-600">Included Benefits</label>
                      <ul className="space-y-2">
                        {hmoTier.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-900">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Exclusions */}
                  {hmoTier.exclusions && hmoTier.exclusions.length > 0 && (
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-600">Not Covered</label>
                      <ul className="space-y-2">
                        {hmoTier.exclusions.map((exclusion, idx) => (
                          <li key={idx} className="flex items-start gap-2 rounded-lg bg-rose-50 p-3">
                            <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-900">{exclusion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Addresses */}
            {systemHMO.addresses && systemHMO.addresses.length > 1 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">All Locations</h3>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-2">
                    {systemHMO.addresses.map((address, idx) => (
                      <li key={idx} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                        <span className="text-sm text-slate-900">{address}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Additional Contact Numbers */}
            {systemHMO.contact_numbers && systemHMO.contact_numbers.length > 1 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">All Contact Numbers</h3>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-2">
                    {systemHMO.contact_numbers.map((number, idx) => (
                      <li key={idx} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <a href={`tel:${number}`} className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                          {number}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* My Coverage */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-slate-900">My Coverage</h3>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Insurance Number</label>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">{insuranceNumber}</p>
                </div>

                {hmoTier && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Plan Tier</label>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {tierColors?.icon}
                      {hmoTier.name}
                    </p>
                  </div>
                )}

                {enrolledAt && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Enrolled Since</label>
                    <div className="mt-1 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        {formatDate(enrolledAt)}
                      </span>
                    </div>
                  </div>
                )}

                {expiryDate && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Coverage Expiry</label>
                    <div className={`mt-1 flex items-center gap-2 rounded-lg px-3 py-2 ${
                      expired 
                        ? "bg-rose-50" 
                        : expiringSoon 
                        ? "bg-amber-50" 
                        : "bg-emerald-50"
                    }`}>
                      <Calendar className={`h-4 w-4 ${
                        expired 
                          ? "text-rose-600" 
                          : expiringSoon 
                          ? "text-amber-600" 
                          : "text-emerald-600"
                      }`} />
                      <span className={`text-sm font-semibold ${
                        expired 
                          ? "text-rose-900" 
                          : expiringSoon 
                          ? "text-amber-900" 
                          : "text-emerald-900"
                      }`}>
                        {formatDate(expiryDate)}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-slate-600">Status</label>
                  <div className={`mt-1 flex items-center gap-2 rounded-lg px-3 py-2 ${
                    expired 
                      ? "bg-rose-50" 
                      : "bg-emerald-50"
                  }`}>
                    {expired ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        <span className="text-sm font-semibold text-rose-900">Expired</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-900">Active</span>
                      </>
                    )}
                  </div>
                </div>

                {notes && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Additional Notes</label>
                    <div className="mt-1 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-700">{notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Help Card */}
            <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white shadow-sm">
                <Info className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Need Help?</h3>
              <p className="mt-1 text-sm text-slate-600">
                If you have questions about your coverage, tier benefits, or need to update your insurance information, please contact the facility's front desk.
              </p>
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Tier upgrades or downgrades</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Coverage extension requests</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Claim support and inquiries</span>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}