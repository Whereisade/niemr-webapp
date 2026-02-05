"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHMOFinancials } from "@/lib/useHMOFinancials";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  Shield,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCcw,
  User,
  CreditCard,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileCheck,
  Contact,
} from "lucide-react";

// Existing imports
import { useHMOOutstanding } from "@/lib/useHMOOutstanding";
import { usePayments } from "@/lib/usePayments";
import { useRecordHMOPayment } from "@/lib/useRecordHMOPayment";
import HMOPaymentModal from "@/components/billing/HMOPaymentModal";
import HMOPaymentHistory from "@/components/billing/HMOPaymentHistory";
import RelationshipStatusCard from "@/components/RelationshipStatusCard";

function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function StatCard({ icon: Icon, label, value, trend, trendLabel, colorClass = "blue" }) {
  const colors = {
    blue: {
      bg: "bg-blue-50",
      icon: "bg-blue-100 text-blue-700",
      text: "text-blue-900",
      value: "text-blue-700",
    },
    emerald: {
      bg: "bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-900",
      value: "text-emerald-700",
    },
    amber: {
      bg: "bg-amber-50",
      icon: "bg-amber-100 text-amber-700",
      text: "text-amber-900",
      value: "text-amber-700",
    },
    slate: {
      bg: "bg-slate-50",
      icon: "bg-slate-100 text-slate-700",
      text: "text-slate-900",
      value: "text-slate-700",
    },
  };

  const color = colors[colorClass] || colors.blue;

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 ${color.bg} p-4 transition hover:shadow-md`}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${color.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className={`mb-1 text-2xl font-bold ${color.value}`}>{value}</div>
      <div className={`text-xs font-medium ${color.text}`}>{label}</div>
      {trendLabel && <div className="mt-1 text-[10px] text-slate-500">{trendLabel}</div>}
    </div>
  );
}

function ContactInfoCard({ hmo }) {
  if (!hmo) return null;

  const hasContactPerson = hmo.contact_person_name || hmo.contact_person_phone || hmo.contact_person_email;
  const hasAddresses = hmo.addresses && hmo.addresses.length > 0;
  const hasContactNumbers = hmo.contact_numbers && hmo.contact_numbers.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100">
            <Contact className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Contact Information</h2>
            <p className="text-xs text-slate-600">HMO contact details and office information</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Primary Contact Details */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Building2 className="h-4 w-4 text-slate-600" />
            Primary Contact
          </h3>
          <div className="space-y-3">
            {/* Email */}
            {hmo.email && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Mail className="h-4 w-4 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-600">Email Address</div>
                  <a
                    href={`mailto:${hmo.email}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {hmo.email}
                  </a>
                </div>
              </div>
            )}

            {/* NHIS Number */}
            {hmo.nhis_number && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <FileCheck className="h-4 w-4 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-600">NHIS Registration Number</div>
                  <div className="text-sm font-semibold text-slate-900">{hmo.nhis_number}</div>
                </div>
              </div>
            )}

            {/* Contact Numbers */}
            {hasContactNumbers && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Phone className="h-4 w-4 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-600 mb-1">Contact Numbers</div>
                  <div className="space-y-1">
                    {hmo.contact_numbers.map((number, idx) => (
                      <a
                        key={idx}
                        href={`tel:${number}`}
                        className="block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {number}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Addresses */}
            {hasAddresses && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-600 mb-1">Office Addresses</div>
                  <div className="space-y-2">
                    {hmo.addresses.map((address, idx) => (
                      <div key={idx} className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Office {idx + 1}:</span> {address}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Person */}
        {hasContactPerson && (
          <div className="border-t border-slate-200 pt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <User className="h-4 w-4 text-slate-600" />
              Contact Person
            </h3>
            <div className="space-y-3">
              {/* Name */}
              {hmo.contact_person_name && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <User className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-blue-700">Name</div>
                    <div className="text-sm font-semibold text-blue-900">{hmo.contact_person_name}</div>
                  </div>
                </div>
              )}

              {/* Phone */}
              {hmo.contact_person_phone && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <Phone className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-blue-700">Phone Number</div>
                    <a
                      href={`tel:${hmo.contact_person_phone}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {hmo.contact_person_phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {hmo.contact_person_email && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-blue-700">Email Address</div>
                    <a
                      href={`mailto:${hmo.contact_person_email}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {hmo.contact_person_email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hmo.email && !hasContactNumbers && !hasAddresses && !hasContactPerson && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <Contact className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No contact information available</p>
            <p className="mt-1 text-xs text-slate-500">
              Contact details will appear here once added
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientRow({ patient, onSelect, isSelected }) {
  return (
    <button
      onClick={() => onSelect(patient)}
      className={`w-full text-left transition hover:bg-slate-50 ${
        isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-full ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}>
            <User className={`h-5 w-5 ${isSelected ? "text-blue-600" : "text-slate-600"}`} />
          </div>
          <div>
            <div className={`font-medium ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
              {patient.first_name} {patient.last_name}
            </div>
            <div className="text-xs text-slate-500">
              ID: {patient.id} • {patient.email || "No email"}
            </div>
          </div>
        </div>
        {isSelected && (
          <div className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            Selected
          </div>
        )}
      </div>
    </button>
  );
}

function ChargeRow({ charge, onViewPatient }) {
  const outstanding = Number(charge.amount || 0) - Number(charge.allocated_total || 0);
  const isFullyPaid = outstanding <= 0.01;

  return (
    <tr className="transition hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{charge.service_name || charge.service_code}</div>
        <div className="text-xs text-slate-500">
          {charge.description && `${charge.description} • `}
          #{charge.id}
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onViewPatient?.(charge.patient)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          {charge.patient_name || `Patient #${charge.patient}`}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="font-semibold text-slate-900">{formatMoney(charge.amount)}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="font-semibold text-emerald-700">{formatMoney(charge.allocated_total)}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className={`font-semibold ${isFullyPaid ? "text-slate-400" : "text-amber-700"}`}>
          {formatMoney(outstanding)}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
          charge.status === "PAID"
            ? "bg-emerald-50 text-emerald-700"
            : charge.status === "PARTIALLY_PAID"
            ? "bg-amber-50 text-amber-700"
            : charge.status === "VOID"
            ? "bg-slate-100 text-slate-600"
            : "bg-rose-50 text-rose-700"
        }`}>
          {charge.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-xs text-slate-500">
        {formatDate(charge.created_at)}
      </td>
    </tr>
  );
}

function ChargeCard({ charge, onViewPatient }) {
  const outstanding = Number(charge.amount || 0) - Number(charge.allocated_total || 0);
  const isFullyPaid = outstanding <= 0.01;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900">{charge.service_name || charge.service_code}</div>
          <div className="text-xs text-slate-500">
            {charge.description && `${charge.description} - `}
            #{charge.id}
          </div>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            charge.status === "PAID"
              ? "bg-emerald-50 text-emerald-700"
              : charge.status === "PARTIALLY_PAID"
              ? "bg-amber-50 text-amber-700"
              : charge.status === "VOID"
              ? "bg-slate-100 text-slate-600"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {charge.status}
        </span>
      </div>

      <div className="mb-3">
        <button
          onClick={() => onViewPatient?.(charge.patient)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          {charge.patient_name || `Patient #${charge.patient}`}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-slate-500">Amount</div>
          <div className="text-sm font-semibold text-slate-900">{formatMoney(charge.amount)}</div>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2">
          <div className="text-emerald-700">Paid</div>
          <div className="text-sm font-semibold text-emerald-800">{formatMoney(charge.allocated_total)}</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-2">
          <div className="text-amber-700">Outstanding</div>
          <div className={`text-sm font-semibold ${isFullyPaid ? "text-slate-500" : "text-amber-800"}`}>
            {formatMoney(outstanding)}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="text-slate-500">Date</div>
          <div className="text-sm font-medium text-slate-700">{formatDate(charge.created_at)}</div>
        </div>
      </div>
    </div>
  );
}

export default function HMODetailPage() {
  const params = useParams();
  const router = useRouter();
  const hmoId = params?.id;

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "charges", "payments"
  const [me, setMe] = useState(null);
  const [facilityId, setFacilityId] = useState(null);

  // Load user and facility context
  useEffect(() => {
    async function loadMe() {
      try {
        const res = await apiFetch("/accounts/me/");
        setMe(res);
        
        // Get facility ID from user's facility or context
        // Handle both object {id: 1} and direct ID 1
        let fId = null;
        if (res?.facility) {
          fId = typeof res.facility === 'object' ? res.facility.id : res.facility;
        } else if (res?.current_facility) {
          fId = typeof res.current_facility === 'object' ? res.current_facility.id : res.current_facility;
        } else if (res?.facility_id) {
          fId = res.facility_id;
        }
        
        if (fId) {
          setFacilityId(fId);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    }
    loadMe();
  }, []);

  const queryParams = useMemo(() => {
    const p = {};
    if (selectedPatientId) p.patient = selectedPatientId;
    if (dateRange.start) p.start = dateRange.start;
    if (dateRange.end) p.end = dateRange.end;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [selectedPatientId, dateRange, statusFilter]);

  const { data, error, isLoading, mutate } = useHMOFinancials(facilityId, hmoId, queryParams);

  // Debug logging - Remove this after fixing the issue
  useEffect(() => {
    if (data) {
      console.log('=== HMO Data Loaded ===');
      console.log('Full data:', data);
      console.log('HMO object:', data.hmo);
      console.log('Summary object:', data.summary);
      console.log('Charges:', data.charges?.length || 0, 'items');
      console.log('Patients:', data.patients?.length || 0, 'items');
      console.log('======================');
    }
    if (error) {
      console.error('=== HMO Data Error ===');
      console.error('Error:', error);
      console.error('=====================');
    }
  }, [data, error]);

  useEffect(() => {
    console.log('=== Facility Context ===');
    console.log('Facility ID:', facilityId, 'Type:', typeof facilityId);
    console.log('HMO ID:', hmoId);
    console.log('User:', me?.email || 'loading...');
    console.log('=======================');
  }, [facilityId, hmoId, me]);

  const { data: outstandingData, mutate: mutateOutstanding } = useHMOOutstanding(facilityId, hmoId, dateRange);

  const paymentsQuery = useMemo(
    () => ({
      hmo: hmoId,
      payment_source: "HMO",
      ...(dateRange.start && { start: dateRange.start }),
      ...(dateRange.end && { end: dateRange.end }),
    }),
    [hmoId, dateRange]
  );

  const {
    data: paymentsData,
    error: paymentsError,
    isLoading: paymentsLoading,
    mutate: mutatePayments,
  } = usePayments(paymentsQuery);

  const { recordPayment, isLoading: isRecordingPayment } = useRecordHMOPayment();

  const handlePaymentSubmit = async (paymentData) => {
    try {
      await recordPayment(paymentData);
      mutate();
      mutateOutstanding();
      mutatePayments();
    } catch (err) {
      throw err;
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
  };

  const handleRelationshipStatusUpdate = async ({ status, notes }) => {
    if (!facilityId) {
      console.error("Facility ID not available");
      return;
    }
    
    try {
      await apiFetch(`/facilities/${facilityId}/hmos/${hmoId}/update_relationship/`, {
        method: "POST",
        body: JSON.stringify({ status, notes }),
      });
      
      mutate();
    } catch (err) {
      throw err;
    }
  };

  const isAdmin = useMemo(() => {
    if (!me) return false;
    const role = (me?.role || "").toUpperCase();
    return ["SUPER_ADMIN", "ADMIN"].includes(role);
  }, [me]);

  const filteredPatients = useMemo(() => {
    if (!data?.patients) return [];
    if (!searchTerm.trim()) return data.patients;

    const query = searchTerm.toLowerCase();
    return data.patients.filter((p) => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      const email = (p.email || "").toLowerCase();
      const id = String(p.id);
      return fullName.includes(query) || email.includes(query) || id.includes(query);
    });
  }, [data?.patients, searchTerm]);

  const collectionRate = useMemo(() => {
    if (!data?.summary) return 0;
    const { charges_total = 0, payments_total = 0 } = data.summary;
    return charges_total > 0 ? (payments_total / charges_total) * 100 : 0;
  }, [data?.summary]);

  if (!facilityId || (isLoading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">
            {!facilityId ? "Loading facility context..." : "Loading HMO details..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-rose-600" />
          <h2 className="mb-2 text-lg font-bold text-rose-900">Failed to Load HMO</h2>
          <p className="text-sm text-rose-700">{error?.message || "Unknown error occurred"}</p>
          {error?.response?.status === 404 && (
            <p className="mt-2 text-xs text-rose-600">
              This HMO might not exist or you don't have permission to view it.
            </p>
          )}
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data || !facilityId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">
            {!facilityId ? "Loading facility context..." : "Loading HMO details..."}
          </p>
        </div>
      </div>
    );
  }

  const { hmo = {}, summary = {}, charges = [], patients = [] } = data || {};
  const outstandingBalance = outstandingData?.summary?.total_outstanding || summary?.outstanding || 0;
  const payments = paymentsData?.results || paymentsData || [];

  return (
    <div className="mx-auto max-w-[1600px] p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to HMOs
        </button>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{hmo?.name || "HMO Details"}</h1>
                <p className="text-sm text-slate-600">Complete financial overview and patient charges</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-700 hover:to-emerald-800 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Make Payment
            </button>
            <button
              onClick={() => {
                mutate();
                mutateOutstanding();
                mutatePayments();
              }}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Patients"
          value={summary?.total_patients || 0}
          colorClass="blue"
        />
        <StatCard
          icon={FileText}
          label="Total Charges"
          value={formatMoney(summary?.charges_total || 0)}
          colorClass="slate"
          trendLabel={`${summary?.charges_count || 0} charge items`}
        />
        <StatCard
          icon={CreditCard}
          label="Payments Collected"
          value={formatMoney(summary?.payments_total || 0)}
          colorClass="emerald"
          trendLabel={`${collectionRate.toFixed(1)}% collection rate`}
        />
        <StatCard
          icon={DollarSign}
          label="Outstanding Balance"
          value={formatMoney(summary?.outstanding || 0)}
          colorClass="amber"
        />
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max items-center gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === "overview"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("charges")}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === "charges"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Charges & Patients
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-3 text-sm font-semibold transition ${
              activeTab === "payments"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Payment History
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Relationship Status */}
          <RelationshipStatusCard
            hmo={hmo}
            onUpdate={handleRelationshipStatusUpdate}
            isAdmin={isAdmin}
          />

          {/* Contact Information */}
          <ContactInfoCard hmo={hmo} />
        </div>
      )}

      {/* Charges Tab */}
      {activeTab === "charges" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[350px_1fr]">
          {/* Left Column - Patients List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Patients</h2>
                  <p className="text-xs text-slate-600">{filteredPatients.length} patient(s)</p>
                </div>
                {selectedPatientId && (
                  <button
                    onClick={() => setSelectedPatientId(null)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patients..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="max-h-[600px] overflow-auto divide-y divide-slate-100">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p) => (
                  <PatientRow
                    key={p.id}
                    patient={p}
                    onSelect={(patient) => setSelectedPatientId(
                      selectedPatientId === patient.id ? null : patient.id
                    )}
                    isSelected={selectedPatientId === p.id}
                  />
                ))
              ) : (
                <div className="p-8 text-center">
                  <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    {searchTerm ? "No patients found" : "No patients attached to this HMO"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Charges Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {selectedPatientId ? "Patient Charges" : "All Charges"}
                  </h2>
                  <p className="text-xs text-slate-600">{charges?.length || 0} charge(s)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    title="Export charges"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Calendar className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 py-1.5 text-xs outline-none focus:border-blue-400"
                    placeholder="Start date"
                  />
                </div>
                <div className="relative flex-1 min-w-[200px]">
                  <Calendar className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 py-1.5 text-xs outline-none focus:border-blue-400"
                    placeholder="End date"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-blue-400 sm:w-auto"
                >
                  <option value="">All Statuses</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="PAID">Paid</option>
                  <option value="VOID">Void</option>
                </select>
                {(dateRange.start || dateRange.end || statusFilter) && (
                  <button
                    onClick={() => {
                      setDateRange({ start: "", end: "" });
                      setStatusFilter("");
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {charges && charges.length > 0 ? (
                charges.map((charge) => (
                  <ChargeCard
                    key={charge.id}
                    charge={charge}
                    onViewPatient={(patientId) => setSelectedPatientId(patientId)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No charges found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedPatientId
                      ? "This patient has no charges in the selected period"
                      : "No charges have been recorded for this HMO yet"}
                  </p>
                </div>
              )}
            </div>

            <div className="hidden overflow-auto lg:block">
              {charges && charges.length > 0 ? (
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur">
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {charges.map((charge) => (
                      <ChargeRow
                        key={charge.id}
                        charge={charge}
                        onViewPatient={(patientId) => setSelectedPatientId(patientId)}
                      />
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No charges found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedPatientId
                      ? "This patient has no charges in the selected period"
                      : "No charges have been recorded for this HMO yet"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <HMOPaymentHistory
          payments={payments}
          isLoading={paymentsLoading}
          error={paymentsError}
        />
      )}

      {/* Payment Modal */}
      <HMOPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        hmo={hmo}
        outstandingBalance={outstandingBalance}
        onSubmit={handlePaymentSubmit}
        onPaymentSuccess={handlePaymentSuccess}
        isSubmitting={isRecordingPayment}
      />
    </div>
  );
}
