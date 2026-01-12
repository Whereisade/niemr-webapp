"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APPT_TYPES, createAppointment } from "@/lib/appointmentsActions";
import { apiFetch } from "@/lib/api";
import { fetchDependents } from "@/lib/dependents";
import {
  CalendarRange,
  Clock,
  Stethoscope,
  Building2,
  Mail,
  ArrowLeft,
  Info,
  FlaskConical,
  CheckCircle2,
  Users,
} from "lucide-react";

const PROVIDER_TYPES = [
  { value: "DOCTOR", label: "Doctor", icon: Stethoscope },
  { value: "NURSE", label: "Nurse", icon: Users },
  { value: "LAB_SCIENTIST", label: "Lab Scientist", icon: FlaskConical },
  { value: "PHARMACIST", label: "Pharmacist", icon: Building2 },
];

// Dynamic appointment types based on provider/facility type
const getAppointmentTypes = (bookingMode, providerType) => {
  if (bookingMode === "independent") {
    switch (providerType) {
      case "LAB_SCIENTIST":
        return [
          { value: "LAB", label: "Lab Visit" },
          { value: "FOLLOW_UP", label: "Follow-up Lab" },
        ];
      case "PHARMACIST":
        return [
          { value: "PHARMACY", label: "Pharmacy Pickup" },
          { value: "CONSULT", label: "Consultation" },
        ];
      case "DOCTOR":
      case "NURSE":
        return [
          { value: "CONSULT", label: "Consultation" },
          { value: "FOLLOW_UP", label: "Follow-up" },
          { value: "OTHER", label: "Other" },
        ];
      default:
        return APPT_TYPES;
    }
  }
  // Facility booking - show all types
  return APPT_TYPES;
};

function combineDateTime(date, time) {
  if (!date || !time) return null;
  const iso = `${date}T${time}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function PatientNewAppointmentPage() {
  const router = useRouter();

  // Booking mode: "facility" or "independent"
  const [bookingMode, setBookingMode] = useState("facility");
  
  // Provider type for independent booking
  const [providerType, setProviderType] = useState("DOCTOR");

  // Form state
  const [apptType, setApptType] = useState("CONSULT");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [providerId, setProviderId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Dropdown data
  const [providers, setProviders] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [facilityProviders, setFacilityProviders] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [selectedLabTests, setSelectedLabTests] = useState([]);
  const [pharmacyDrugs, setPharmacyDrugs] = useState([]);
  const [selectedPharmacyDrugs, setSelectedPharmacyDrugs] = useState([]);
  
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingFacilityProviders, setLoadingFacilityProviders] = useState(false);
  const [loadingLabTests, setLoadingLabTests] = useState(false);
  const [labTestsError, setLabTestsError] = useState("");
  const [loadingPharmacyDrugs, setLoadingPharmacyDrugs] = useState(false);
  const [pharmacyDrugsError, setPharmacyDrugsError] = useState("");
  
  // Search states for dropdowns
  const [facilitySearch, setFacilitySearch] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [labTestSearch, setLabTestSearch] = useState("");
  const [pharmacyDrugSearch, setPharmacyDrugSearch] = useState("");

  // Dependents data
  const [dependents, setDependents] = useState([]);
  const [loadingDependents, setLoadingDependents] = useState(true);
  const [dependentsError, setDependentsError] = useState("");
  const [whoFor, setWhoFor] = useState("self");

  // Load facilities on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchFacilities() {
      try {
        setLoadingFacilities(true);
        const res = await apiFetch("/facilities/?page=1&limit=50");
        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setFacilities(items);
      } catch (err) {
        console.error("Failed to load facilities", err);
        if (!cancelled) {
          setFacilities([]);
        }
      } finally {
        if (!cancelled) setLoadingFacilities(false);
      }
    }

    fetchFacilities();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load independent providers when booking mode changes or provider type changes
  useEffect(() => {
    if (bookingMode !== "independent") {
      setProviders([]);
      return;
    }

    let cancelled = false;

    async function fetchProviders() {
      try {
        setLoadingProviders(true);
        // Filter by provider type
        const typeParam = providerType ? `&type=${providerType}` : "";
        const res = await apiFetch(
          `/providers/?facility=none&page=1&limit=100${typeParam}`
        );

        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setProviders(items);
      } catch (err) {
        console.error("Failed to load providers", err);
        if (!cancelled) {
          setProviders([]);
        }
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    }

    fetchProviders();

    return () => {
      cancelled = true;
    };
  }, [bookingMode, providerType]);

  // Load facility providers when facility is selected
  useEffect(() => {
    if (bookingMode !== "facility" || !facilityId) {
      setFacilityProviders([]);
      return;
    }

    let cancelled = false;

    async function fetchFacilityProviders() {
      try {
        setLoadingFacilityProviders(true);
        const res = await apiFetch(
          `/providers/?facility=${facilityId}&page=1&limit=100`
        );

        if (cancelled) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setFacilityProviders(items);
      } catch (err) {
        console.error("Failed to load facility providers", err);
        if (!cancelled) {
          setFacilityProviders([]);
        }
      } finally {
        if (!cancelled) setLoadingFacilityProviders(false);
      }
    }

    fetchFacilityProviders();

    return () => {
      cancelled = true;
    };
  }, [bookingMode, facilityId]);

  // Load lab tests when LAB_SCIENTIST provider type is selected
  useEffect(() => {
    if (bookingMode !== "independent" || providerType !== "LAB_SCIENTIST") {
      setLabTests([]);
      setSelectedLabTests([]);
      setLabTestsError("");
      return;
    }

    // Only fetch if a provider is selected
    if (!providerId) {
      setLabTests([]);
      setSelectedLabTests([]);
      setLabTestsError("Please select a lab scientist to view their available tests.");
      return;
    }

    let cancelled = false;

    async function fetchLabTests() {
      try {
        setLoadingLabTests(true);
        setLabTestsError("");
        console.log("Fetching lab tests catalog for provider:", providerId);
        
        // ✅ FIX: Filter by the selected provider's catalog using created_by parameter
        const res = await apiFetch(`/labs/catalog/?page=1&limit=200&created_by=${providerId}`);
        console.log("Lab tests response:", res);

        if (cancelled) return;
        
        let items = [];
        if (Array.isArray(res)) {
          items = res;
        } else if (res?.results && Array.isArray(res.results)) {
          items = res.results;
        } else if (res && typeof res === "object") {
          // Handle numeric keys (BFF wrapper)
          const numericKeys = Object.keys(res).filter((k) => /^\d+$/.test(k));
          if (numericKeys.length) {
            items = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => res[k])
              .filter(Boolean);
          }
        }
        
        console.log("Processed lab tests:", items);
        setLabTests(items);
        
        if (items.length === 0) {
          setLabTestsError("This lab scientist has no tests in their catalog yet. You can still proceed with your appointment.");
        }
      } catch (err) {
        console.error("Failed to load lab tests", err);
        if (!cancelled) {
          setLabTestsError(err?.message || "Could not load lab tests catalog.");
          setLabTests([]);
        }
      } finally {
        if (!cancelled) setLoadingLabTests(false);
      }
    }

    fetchLabTests();

    return () => {
      cancelled = true;
    };
  }, [bookingMode, providerType, providerId]);

  // Load pharmacy drugs when PHARMACIST provider type is selected
  useEffect(() => {
    if (bookingMode !== "independent" || providerType !== "PHARMACIST") {
      setPharmacyDrugs([]);
      setSelectedPharmacyDrugs([]);
      setPharmacyDrugsError("");
      return;
    }

    // Only fetch if a provider is selected
    if (!providerId) {
      setPharmacyDrugs([]);
      setSelectedPharmacyDrugs([]);
      setPharmacyDrugsError("Please select a pharmacist to view their available medications.");
      return;
    }

    let cancelled = false;

    async function fetchPharmacyDrugs() {
      try {
        setLoadingPharmacyDrugs(true);
        setPharmacyDrugsError("");
        console.log("Fetching pharmacy drugs catalog for provider:", providerId);
        
        // ✅ FIX: Filter by the selected provider's catalog using created_by parameter
        const res = await apiFetch(`/pharmacy/catalog/?page=1&limit=200&created_by=${providerId}`);
        console.log("Pharmacy drugs response:", res);

        if (cancelled) return;
        
        let items = [];
        if (Array.isArray(res)) {
          items = res;
        } else if (res?.results && Array.isArray(res.results)) {
          items = res.results;
        } else if (res && typeof res === "object") {
          // Handle numeric keys (BFF wrapper)
          const numericKeys = Object.keys(res).filter((k) => /^\d+$/.test(k));
          if (numericKeys.length) {
            items = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => res[k])
              .filter(Boolean);
          }
        }
        
        console.log("Processed pharmacy drugs:", items);
        setPharmacyDrugs(items);
        
        if (items.length === 0) {
          setPharmacyDrugsError("This pharmacist has no drugs in their catalog yet. You can still proceed with your appointment.");
        }
      } catch (err) {
        console.error("Failed to load pharmacy drugs", err);
        if (!cancelled) {
          setPharmacyDrugsError(err?.message || "Could not load pharmacy drugs catalog.");
          setPharmacyDrugs([]);
        }
      } finally {
        if (!cancelled) setLoadingPharmacyDrugs(false);
      }
    }

    fetchPharmacyDrugs();

    return () => {
      cancelled = true;
    };
  }, [bookingMode, providerType, providerId]);

  // Load dependents once on mount
  useEffect(() => {
    let cancelled = false;

    async function loadDeps() {
      try {
        setLoadingDependents(true);
        setDependentsError("");

        const res = await fetchDependents();

        if (cancelled) return;

        let items = [];
        if (Array.isArray(res?.results)) {
          items = res.results;
        } else if (Array.isArray(res)) {
          items = res;
        } else if (res && typeof res === "object") {
          const numericKeys = Object.keys(res).filter((k) =>
            /^\d+$/.test(k)
          );
          if (numericKeys.length) {
            items = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => res[k]);
          }
        }

        setDependents(items);
      } catch (err) {
        console.error("Failed to load dependents", err);
        if (!cancelled) {
          setDependentsError(
            err?.message ||
              "Could not load dependents. You can still book for yourself."
          );
          setDependents([]);
        }
      } finally {
        if (!cancelled) setLoadingDependents(false);
      }
    }

    loadDeps();

    return () => {
      cancelled = true;
    };
  }, []);

  // Reset selections when booking mode changes
  useEffect(() => {
    setProviderId("");
    setFacilityId("");
    setSelectedLabTests([]);
    setSelectedPharmacyDrugs([]);
  }, [bookingMode]);

  // Reset provider selection when provider type changes
  useEffect(() => {
    setProviderId("");
    setSelectedLabTests([]);
    setSelectedPharmacyDrugs([]);
    
    // Update appointment type to match provider type
    const availableTypes = getAppointmentTypes(bookingMode, providerType);
    if (!availableTypes.find(t => t.value === apptType)) {
      setApptType(availableTypes[0]?.value || "CONSULT");
    }
  }, [providerType]);

  const handleLabTestToggle = (testId) => {
    setSelectedLabTests((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const handlePharmacyDrugToggle = (drugId) => {
    setSelectedPharmacyDrugs((prev) =>
      prev.includes(drugId)
        ? prev.filter((id) => id !== drugId)
        : [...prev, drugId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const startAt = combineDateTime(date, time);
    if (!startAt) {
      setError("Please enter a valid date and time.");
      return;
    }

    // Default 30 minute duration
    const dur = 30;
    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + dur * 60 * 1000);
    const endAt = endDate.toISOString();

    const payload = {
      appt_type: apptType,
      start_at: startAt,
      end_at: endAt,
    };

    // If booking for a dependent, attach that dependent's patient id
    if (whoFor !== "self") {
      const parsed = Number(whoFor);
      if (parsed && !Number.isNaN(parsed)) {
        payload.patient = parsed;
      }
    }

    // Add provider and facility based on booking mode
    if (bookingMode === "facility") {
      const facility = Number(facilityId);
      if (facility && !Number.isNaN(facility)) {
        payload.facility = facility;
      }
      const provider = Number(providerId);
      if (provider && !Number.isNaN(provider)) {
        payload.provider = provider;
      }
    } else {
      // Independent provider
      const provider = Number(providerId);
      if (provider && !Number.isNaN(provider)) {
        payload.provider = provider;
      }
    }

    if (reason.trim()) {
      payload.reason = reason.trim();
    }

    // Add selected lab tests to reason if LAB_SCIENTIST booking
    if (
      bookingMode === "independent" &&
      providerType === "LAB_SCIENTIST" &&
      selectedLabTests.length > 0
    ) {
      const testNames = selectedLabTests
        .map((id) => {
          const test = labTests.find((t) => t.id === id);
          return test ? test.name || test.test_name : null;
        })
        .filter(Boolean);

      if (testNames.length > 0) {
        const testsText = `Lab tests: ${testNames.join(", ")}`;
        payload.reason = payload.reason
          ? `${payload.reason}\n\n${testsText}`
          : testsText;
      }
    }

    // Add selected pharmacy drugs to reason if PHARMACIST booking
    if (
      bookingMode === "independent" &&
      providerType === "PHARMACIST" &&
      selectedPharmacyDrugs.length > 0
    ) {
      const drugNames = selectedPharmacyDrugs
        .map((id) => {
          const drug = pharmacyDrugs.find((d) => d.id === id);
          return drug ? drug.name : null;
        })
        .filter(Boolean);

      if (drugNames.length > 0) {
        const drugsText = `Medications: ${drugNames.join(", ")}`;
        payload.reason = payload.reason
          ? `${payload.reason}\n\n${drugsText}`
          : drugsText;
      }
    }

    payload.notify_email = !!sendEmail;
    setIsSubmitting(true);
    try {
      await createAppointment(payload);
      router.push("/patient/appointments");
    } catch (err) {
      console.error("Create appointment failed", err);
      setError(
        err?.message ||
          "Failed to create appointment. Please check your entries and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !isSubmitting && !!date && !!time;

  // Use p.user (User id) instead of profile id
  const selectedProvider = bookingMode === "facility"
    ? facilityProviders.find((p) => String(p.user) === String(providerId))
    : providers.find((p) => String(p.user) === String(providerId));
    
  const selectedFacility = facilities.find(
    (f) => String(f.id) === String(facilityId)
  );

  const providerName = selectedProvider
    ? [selectedProvider.first_name, selectedProvider.last_name]
        .filter(Boolean)
        .join(" ")
    : "";
  const providerRole = selectedProvider
    ? selectedProvider.specialty || selectedProvider.role || ""
    : "";

  const facilityName = selectedFacility
    ? selectedFacility.name || `Facility #${selectedFacility.id}`
    : "";

  return (
    <main className="relative mx-auto max-w-5xl p-6 md:p-10 space-y-6">
      {/* soft background accents for design parity */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100 blur-3xl opacity-60" />

      {/* Header */}
      <header className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <CalendarRange className="h-3.5 w-3.5" />
            Patient · Book Appointment
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Book an appointment
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose between booking at a facility or with an independent provider.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/patient/appointments")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my appointments
        </button>
      </header>

      {/* Form + side rail */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Booking Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Where would you like to book?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBookingMode("facility")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition ${
                    bookingMode === "facility"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Building2 className={`h-6 w-6 ${bookingMode === "facility" ? "text-blue-600" : "text-slate-400"}`} />
                  <span className={`text-sm font-medium ${bookingMode === "facility" ? "text-blue-900" : "text-slate-700"}`}>
                    At a Facility
                  </span>
                  {bookingMode === "facility" && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBookingMode("independent")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition ${
                    bookingMode === "independent"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Stethoscope className={`h-6 w-6 ${bookingMode === "independent" ? "text-blue-600" : "text-slate-400"}`} />
                  <span className={`text-sm font-medium ${bookingMode === "independent" ? "text-blue-900" : "text-slate-700"}`}>
                    Independent Provider
                  </span>
                  {bookingMode === "independent" && (
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Who is this appointment for? */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Book for
              </label>
              <select
                value={whoFor}
                onChange={(e) => setWhoFor(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="self">Myself</option>
                {dependents.map((dep) => {
                  const fullName = [dep.first_name, dep.last_name]
                    .filter(Boolean)
                    .join(" ");
                  const label =
                    fullName || dep.name || `Dependent #${dep.id}`;
                  const relationship =
                    dep.relationship || dep.relation || "";
                  return (
                    <option key={dep.id} value={String(dep.id)}>
                      {label}
                      {relationship ? ` (${relationship})` : ""}
                    </option>
                  );
                })}
              </select>

              {loadingDependents && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Loading dependents…
                </p>
              )}

              {dependentsError && (
                <p className="mt-1 text-[11px] text-amber-600">
                  {dependentsError}
                </p>
              )}
            </div>

            {/* Facility Booking Fields */}
            {bookingMode === "facility" && (
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Select Facility
                </label>
                
                {/* Search input */}
                <input
                  type="text"
                  placeholder="Search facilities..."
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  className="w-full rounded-t-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                
                {/* Facility list */}
                <div className="max-h-48 overflow-y-auto rounded-b-lg border border-t-0 border-slate-300 bg-white">
                  {loadingFacilities ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading facilities…</div>
                  ) : (
                    <>
                      {!facilityId && (
                        <button
                          type="button"
                          onClick={() => setFacilityId("")}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-200"
                        >
                          <div className="font-medium">Choose a facility</div>
                        </button>
                      )}
                      {facilities
                        .filter((f) => {
                          if (!facilitySearch) return true;
                          const searchLower = facilitySearch.toLowerCase();
                          const name = (f.name || "").toLowerCase();
                          const address = (f.address || "").toLowerCase();
                          const state = (f.state || "").toLowerCase();
                          return name.includes(searchLower) || address.includes(searchLower) || state.includes(searchLower);
                        })
                        .map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setFacilityId(String(f.id));
                              setFacilitySearch("");
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-200 last:border-b-0 ${
                              String(facilityId) === String(f.id) ? "bg-blue-50" : ""
                            }`}
                          >
                            <div className="font-medium text-slate-900">
                              {f.name || `Facility #${f.id}`}
                            </div>
                            {(f.address || f.state) && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {[f.address, f.state].filter(Boolean).join(", ")}
                              </div>
                            )}
                          </button>
                        ))}
                      {facilities.filter((f) => {
                        if (!facilitySearch) return true;
                        const searchLower = facilitySearch.toLowerCase();
                        const name = (f.name || "").toLowerCase();
                        const address = (f.address || "").toLowerCase();
                        const state = (f.state || "").toLowerCase();
                        return name.includes(searchLower) || address.includes(searchLower) || state.includes(searchLower);
                      }).length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500">
                          No facilities found
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  The facility will assign you to an available provider.
                </p>
              </div>
            )}

            {/* Independent Provider Booking Fields */}
            {bookingMode === "independent" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Provider Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PROVIDER_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setProviderType(type.value)}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition ${
                            providerType === type.value
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${providerType === type.value ? "text-blue-600" : "text-slate-400"}`} />
                          <span className={`text-xs font-medium ${providerType === type.value ? "text-blue-900" : "text-slate-700"}`}>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Stethoscope className="h-4 w-4 text-slate-500" />
                    Select {PROVIDER_TYPES.find(t => t.value === providerType)?.label}
                  </label>
                  
                  {/* Search input */}
                  <input
                    type="text"
                    placeholder="Search providers..."
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    disabled={loadingProviders}
                    className="w-full rounded-t-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                  
                  {/* Provider list */}
                  <div className="max-h-48 overflow-y-auto rounded-b-lg border border-t-0 border-slate-300 bg-white">
                    {loadingProviders ? (
                      <div className="px-3 py-2 text-sm text-slate-500">Loading providers…</div>
                    ) : (
                      <>
                        {!providerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setProviderId("");
                              setProviderSearch("");
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-200"
                          >
                            <div className="font-medium">Choose a {PROVIDER_TYPES.find(t => t.value === providerType)?.label.toLowerCase()}</div>
                          </button>
                        )}
                        {providers
                          .filter((p) => {
                            if (!providerSearch) return true;
                            const searchLower = providerSearch.toLowerCase();
                            const name = ([p.display_name].filter(Boolean).join(" ") || "").toLowerCase();
                            const email = (p.email || "").toLowerCase();
                            const address = (p.address || "").toLowerCase();
                            const state = (p.state || "").toLowerCase();
                            return name.includes(searchLower) || email.includes(searchLower) || address.includes(searchLower) || state.includes(searchLower);
                          })
                          .map((p) => {
                            const fullName = [p.display_name].filter(Boolean).join(" ") || p.email || `Provider #${p.id}`;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setProviderId(String(p.user));
                                  setProviderSearch("");
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-200 last:border-b-0 ${
                                  String(providerId) === String(p.user) ? "bg-blue-50" : ""
                                }`}
                              >
                                <div className="font-medium text-slate-900">
                                  {fullName}
                                  {p.provider_type ? ` - ${p.provider_type}` : ""}
                                </div>
                                {(p.address || p.state) && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {[p.address, p.state].filter(Boolean).join(", ")}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        {providers.filter((p) => {
                          if (!providerSearch) return true;
                          const searchLower = providerSearch.toLowerCase();
                          const name = ([p.display_name].filter(Boolean).join(" ") || "").toLowerCase();
                          const email = (p.email || "").toLowerCase();
                          const address = (p.address || "").toLowerCase();
                          const state = (p.state || "").toLowerCase();
                          return name.includes(searchLower) || email.includes(searchLower) || address.includes(searchLower) || state.includes(searchLower);
                        }).length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-500">
                            No providers found
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Lab Test Selection - Always show when LAB_SCIENTIST is selected */}
                {providerType === "LAB_SCIENTIST" && (
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <FlaskConical className="h-4 w-4 text-slate-500" />
                      Select Lab Tests (Optional)
                    </label>
                    
                    {labTestsError && (
                      <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {labTestsError}
                      </div>
                    )}
                    
                    {loadingLabTests ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-xs text-slate-500">Loading lab tests catalog...</p>
                      </div>
                    ) : labTests.length > 0 ? (
                      <>
                        {/* Search input */}
                        <input
                          type="text"
                          placeholder="Search lab tests..."
                          value={labTestSearch}
                          onChange={(e) => setLabTestSearch(e.target.value)}
                          className="w-full rounded-t-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-0"
                        />
                        
                        <div className="max-h-48 overflow-y-auto rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 p-3 space-y-2">
                          {labTests
                            .filter((test) => {
                              if (!labTestSearch) return true;
                              const searchLower = labTestSearch.toLowerCase();
                              const name = (test.name || test.test_name || "").toLowerCase();
                              const description = (test.description || "").toLowerCase();
                              return name.includes(searchLower) || description.includes(searchLower);
                            })
                            .map((test) => (
                              <label
                                key={test.id}
                                className="flex items-center gap-2 rounded-lg bg-white p-2 hover:bg-blue-50 cursor-pointer transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLabTests.includes(test.id)}
                                  onChange={() => handleLabTestToggle(test.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-slate-900">
                                    {test.name || test.test_name || `Test #${test.id}`}
                                  </span>
                                  {test.description && (
                                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                                      {test.description}
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))}
                          {labTests.filter((test) => {
                            if (!labTestSearch) return true;
                            const searchLower = labTestSearch.toLowerCase();
                            const name = (test.name || test.test_name || "").toLowerCase();
                            const description = (test.description || "").toLowerCase();
                            return name.includes(searchLower) || description.includes(searchLower);
                          }).length === 0 && (
                            <div className="px-3 py-2 text-sm text-slate-500 text-center">
                              No lab tests found matching "{labTestSearch}"
                            </div>
                          )}
                        </div>
                        {selectedLabTests.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            <p className="text-xs text-blue-600 font-medium">
                              {selectedLabTests.length} test{selectedLabTests.length !== 1 ? 's' : ''} selected
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                        <FlaskConical className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-600 font-medium">No lab tests available</p>
                        <p className="text-xs text-slate-500 mt-1">
                          You can still book your appointment and discuss tests with the lab scientist.
                        </p>
                      </div>
                    )}
                    
                    <p className="mt-2 text-xs text-slate-500">
                      Select the specific lab tests you need. You can discuss additional tests during your visit.
                    </p>
                  </div>
                )}

                {/* Pharmacy Drug Selection - Always show when PHARMACIST is selected */}
                {providerType === "PHARMACIST" && (
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      Select Medications (Optional)
                    </label>
                    
                    {pharmacyDrugsError && (
                      <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {pharmacyDrugsError}
                      </div>
                    )}
                    
                    {loadingPharmacyDrugs ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-xs text-slate-500">Loading pharmacy catalog...</p>
                      </div>
                    ) : pharmacyDrugs.length > 0 ? (
                      <>
                        {/* Search input */}
                        <input
                          type="text"
                          placeholder="Search medications..."
                          value={pharmacyDrugSearch}
                          onChange={(e) => setPharmacyDrugSearch(e.target.value)}
                          className="w-full rounded-t-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-0"
                        />
                        
                        <div className="max-h-48 overflow-y-auto rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 p-3 space-y-2">
                          {pharmacyDrugs
                            .filter((drug) => {
                              if (!pharmacyDrugSearch) return true;
                              const searchLower = pharmacyDrugSearch.toLowerCase();
                              const name = (drug.name || "").toLowerCase();
                              const strength = (drug.strength || "").toLowerCase();
                              const form = (drug.form || "").toLowerCase();
                              return name.includes(searchLower) || strength.includes(searchLower) || form.includes(searchLower);
                            })
                            .map((drug) => (
                              <label
                                key={drug.id}
                                className="flex items-center gap-2 rounded-lg bg-white p-2 hover:bg-blue-50 cursor-pointer transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPharmacyDrugs.includes(drug.id)}
                                  onChange={() => handlePharmacyDrugToggle(drug.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-slate-900">
                                    {drug.name || `Drug #${drug.id}`}
                                  </span>
                                  {(drug.strength || drug.form) && (
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {[drug.strength, drug.form].filter(Boolean).join(" • ")}
                                    </p>
                                  )}
                                </div>
                              </label>
                            ))}
                          {pharmacyDrugs.filter((drug) => {
                            if (!pharmacyDrugSearch) return true;
                            const searchLower = pharmacyDrugSearch.toLowerCase();
                            const name = (drug.name || "").toLowerCase();
                            const strength = (drug.strength || "").toLowerCase();
                            const form = (drug.form || "").toLowerCase();
                            return name.includes(searchLower) || strength.includes(searchLower) || form.includes(searchLower);
                          }).length === 0 && (
                            <div className="px-3 py-2 text-sm text-slate-500 text-center">
                              No medications found matching "{pharmacyDrugSearch}"
                            </div>
                          )}
                        </div>
                        {selectedPharmacyDrugs.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            <p className="text-xs text-blue-600 font-medium">
                              {selectedPharmacyDrugs.length} medication{selectedPharmacyDrugs.length !== 1 ? 's' : ''} selected
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                        <Building2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-600 font-medium">No medications available</p>
                        <p className="text-xs text-slate-500 mt-1">
                          You can still book your appointment and discuss medications with the pharmacist.
                        </p>
                      </div>
                    )}
                    
                    <p className="mt-2 text-xs text-slate-500">
                      Select the medications you need. You can discuss additional options during your visit.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Appointment type - Dynamic based on booking mode and provider type */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Appointment type
              </label>
              <select
                value={apptType}
                onChange={(e) => setApptType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {getAppointmentTypes(bookingMode, providerType).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {bookingMode === "independent" && providerType === "LAB_SCIENTIST" && 
                  "Lab visit appointment for tests and sample collection"}
                {bookingMode === "independent" && providerType === "PHARMACIST" && 
                  "Pharmacy visit for medication pickup or consultation"}
              </p>
            </div>

            {/* Date / time */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CalendarRange className="h-4 w-4 text-slate-500" />
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock className="h-4 w-4 text-slate-500" />
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reason for visit (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Briefly describe why you are booking this appointment."
              />
            </div>

            {/* Email notifications */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Mail className="h-4 w-4 text-slate-500" />
                Email notifications
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Send email notifications (reminders/updates) to my email
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Emails are sent to your registered email.
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={() => router.push("/patient/appointments")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Booking…" : "Book appointment"}
            </button>
          </div>
        </form>

        {/* Right rail: overview + info */}
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500/70 via-teal-500/70 to-cyan-500/70" />
            <div className="p-5 text-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Your booking overview
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                A quick summary of the details you&apos;ve chosen so far.
              </p>

              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Booking type</dt>
                  <dd className="text-right text-slate-900">
                    {bookingMode === "facility" ? "At Facility" : "Independent Provider"}
                  </dd>
                </div>

                {bookingMode === "independent" && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Provider type</dt>
                    <dd className="text-right text-slate-900">
                      {PROVIDER_TYPES.find(t => t.value === providerType)?.label || providerType}
                    </dd>
                  </div>
                )}

                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Appointment type</dt>
                  <dd className="text-right text-slate-900">
                    {
                      (APPT_TYPES.find((t) => t.value === apptType) || {})
                        .label || apptType
                    }
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Date</dt>
                  <dd className="text-right text-slate-900">
                    {date || "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Time</dt>
                  <dd className="text-right text-slate-900">
                    {time || "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="text-right text-slate-900">30 minutes</dd>
                </div>

                {bookingMode === "facility" ? (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Facility</dt>
                      <dd className="text-right text-slate-900">
                        {facilityName || "Not selected"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Provider</dt>
                      <dd className="text-right text-slate-900">
                        Assigned by facility
                      </dd>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Provider</dt>
                    <dd className="text-right text-slate-900">
                      {providerName || "Not selected"}
                      {providerRole ? ` · ${providerRole}` : ""}
                    </dd>
                  </div>
                )}

                {selectedLabTests.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <dt className="text-slate-500 mb-1">Selected Lab Tests</dt>
                    <dd className="text-right text-slate-900">
                      <div className="space-y-1">
                        {selectedLabTests.slice(0, 3).map((testId) => {
                          const test = labTests.find((t) => t.id === testId);
                          return test ? (
                            <div key={testId} className="text-xs">
                              • {test.name || test.test_name}
                            </div>
                          ) : null;
                        })}
                        {selectedLabTests.length > 3 && (
                          <div className="text-xs text-slate-500">
                            +{selectedLabTests.length - 3} more
                          </div>
                        )}
                      </div>
                    </dd>
                  </div>
                )}

                {selectedPharmacyDrugs.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <dt className="text-slate-500 mb-1">Selected Medications</dt>
                    <dd className="text-right text-slate-900">
                      <div className="space-y-1">
                        {selectedPharmacyDrugs.slice(0, 3).map((drugId) => {
                          const drug = pharmacyDrugs.find((d) => d.id === drugId);
                          return drug ? (
                            <div key={drugId} className="text-xs">
                              • {drug.name}
                            </div>
                          ) : null;
                        })}
                        {selectedPharmacyDrugs.length > 3 && (
                          <div className="text-xs text-slate-500">
                            +{selectedPharmacyDrugs.length - 3} more
                          </div>
                        )}
                      </div>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-900">
                Booking Information
              </h3>
            </div>
            {bookingMode === "facility" ? (
              <div>
                <p className="mb-2">
                  You&apos;re booking an appointment at a healthcare facility.
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Select your preferred facility</li>
                  <li>The facility will assign an available provider</li>
                  <li>Your patient profile is linked automatically</li>
                  <li>You can check the status from your appointments page</li>
                </ul>
              </div>
            ) : (
              <div>
                <p className="mb-2">
                  You&apos;re booking with an independent healthcare provider.
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Choose the type of provider you need</li>
                  <li>Select from available providers</li>
                  {providerType === "LAB_SCIENTIST" && (
                    <li>Pick the specific lab tests you need</li>
                  )}
                  <li>Your patient profile is linked automatically</li>
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}