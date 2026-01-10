// app/patient/hmo/page.js - FIXED VERSION
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
  ChevronLeft,
  Heart,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { getHMOStatusColors } from "@/lib/hmoStatusColors";

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

// 🔧 FIXED: Use proxy endpoint and better error handling
async function fetchPatientProfile(token) {
  if (!token) return null;
  
  try {
    // Try using the proxy endpoint
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
    
    // Handle both array and paginated responses
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
  
  // 🔧 FIXED: Don't redirect if patient is null, just show message
  const patient = await fetchPatientProfile(token);

  // Show error message if we couldn't fetch patient data
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
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    Refresh Page
                  </button>
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

  const hasHMO = patient.insurance_status === "INSURED" && patient.hmo;

  if (!hasHMO) {
    // Show no HMO page
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

  const hmo = patient.hmo;
  const insuranceNumber = patient.insurance_number || "Not provided";
  const plan = patient.hmo_plan || "Standard Plan";
  const expiryDate = patient.insurance_expiry;
  const notes = patient.insurance_notes;
  
  const expiringSoon = isExpiringSoon(expiryDate);
  const expired = isExpired(expiryDate);
  
  const statusColors = hmo.relationship_status 
    ? getHMOStatusColors(hmo.relationship_status)
    : null;

  // Get primary contact info - handle both field patterns
  const primaryAddress = hmo.primary_address || (hmo.addresses && hmo.addresses[0]) || "Not provided";
  const primaryContact = hmo.primary_contact || (hmo.contact_numbers && hmo.contact_numbers[0]) || "Not provided";

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

        {/* Header */}
        <div className="mb-8">
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
                  Your insurance coverage expired on {formatDate(expiryDate)}. Please contact {hmo.name} or the facility to renew your coverage.
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
                {/* Provider Name */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Provider Name</label>
                  <p className="mt-1 text-lg font-bold text-slate-900">{hmo.name}</p>
                  {statusColors && (
                    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusColors.bgColor} ${statusColors.textColor} ${statusColors.ringColor}`}>
                      <Heart className="h-3 w-3" />
                      {statusColors.label} Partnership
                    </span>
                  )}
                </div>

                {/* NHIS Number */}
                {hmo.nhis_number && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">NHIS Registration</label>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{hmo.nhis_number}</p>
                  </div>
                )}

                {/* Email */}
                {hmo.email && (
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-slate-600">Email</label>
                      <p className="text-sm text-slate-900">{hmo.email}</p>
                    </div>
                  </div>
                )}

                {/* Primary Contact */}
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <Phone className="h-5 w-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-medium text-slate-600">Primary Contact</label>
                    <p className="text-sm text-slate-900">{primaryContact}</p>
                  </div>
                </div>

                {/* Primary Address */}
                <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <label className="text-xs font-medium text-slate-600">Primary Address</label>
                    <p className="text-sm text-slate-900">{primaryAddress}</p>
                  </div>
                </div>

                {/* Contact Person */}
                {hmo.contact_person_name && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600">Contact Person</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                        <User className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{hmo.contact_person_name}</p>
                        </div>
                      </div>
                      {hmo.contact_person_phone && (
                        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                          <Phone className="h-5 w-5 text-slate-400" />
                          <p className="text-sm text-slate-900">{hmo.contact_person_phone}</p>
                        </div>
                      )}
                      {hmo.contact_person_email && (
                        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                          <Mail className="h-5 w-5 text-slate-400" />
                          <p className="text-sm text-slate-900">{hmo.contact_person_email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Addresses (if multiple) */}
            {hmo.addresses && hmo.addresses.length > 1 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">All Locations</h3>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-2">
                    {hmo.addresses.map((address, idx) => (
                      <li key={idx} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                        <span className="text-sm text-slate-900">{address}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Additional Contact Numbers (if multiple) */}
            {hmo.contact_numbers && hmo.contact_numbers.length > 1 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">All Contact Numbers</h3>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-2">
                    {hmo.contact_numbers.map((number, idx) => (
                      <li key={idx} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-900">{number}</span>
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
                {/* Insurance Number */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Insurance Number</label>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">{insuranceNumber}</p>
                </div>

                {/* Plan */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Plan</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{plan}</p>
                </div>

                {/* Expiry Date */}
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

                {/* Status */}
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

                {/* Notes */}
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
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Need Help?</h3>
              <p className="mt-1 text-sm text-slate-600">
                If you have questions about your coverage or need to update your insurance information, please contact the facility's front desk.
              </p>
              <Link
                href="/support"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Contact Support
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}