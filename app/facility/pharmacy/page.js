"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { usePrescriptions } from "@/lib/usePrescriptions";
import {
  Pill,
  Filter,
  ClipboardList,
  Activity,
  ArrowLeft,
  ArrowRight,
  Plus,
  Boxes,
  TrendingDown,
  Package,
  AlertTriangle,
  Clock,
  Search,
  FileText,
  Loader2,
  CheckCircle2,
  Building2,
  Award,     // For tier icons
  Star,
  TrendingUp,
} from "lucide-react";
import PrescriptionDetailsModal from "@/components/pharmacy/PrescriptionDetailsModal";
import { apiFetch } from "@/lib/api";
import { getHMOStatusColors, getTierColors } from "@/lib/hmoStatusColors";

export default function FacilityPharmacyPage(props) {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">Loading pharmacy...</div>
      }
    >
      <FacilityPharmacyPageInner {...props} />
    </Suspense>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(value);
  }
}

function normalisePrescriptionsPayload(payload) {
  if (!payload) return { rows: [], total: 0 };
  if (Array.isArray(payload.results)) {
    return {
      rows: payload.results,
      total:
        typeof payload.count === "number"
          ? payload.count
          : payload.results.length,
    };
  }
  if (Array.isArray(payload)) {
    return { rows: payload, total: payload.length };
  }
  if (payload && typeof payload === "object") {
    const numericKeys = Object.keys(payload).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      const rows = numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => payload[k]);
      return { rows, total: rows.length };
    }
  }
  return { rows: [], total: 0 };
}

function normaliseList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const numericKeys = Object.keys(payload).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => payload[k]);
    }
  }
  return [];
}

/**
 * Helper function to extract HMO information from patient data
 * Supports both new SystemHMO structure and legacy HMO structure
 */
function getPatientHMOInfo(patientData) {
  if (!patientData) {
    return {
      hasHMO: false,
      hmoName: null,
      tierName: null,
      tierLevel: null,
      relationshipStatus: null,
    };
  }

  // New SystemHMO structure
  if (patientData.system_hmo) {
    const systemHMO = patientData.system_hmo;
    const tier = patientData.hmo_tier;
    
    return {
      hasHMO: true,
      hmoName: typeof systemHMO === 'object' ? systemHMO.name : patientData.system_hmo_name,
      tierName: typeof tier === 'object' ? tier.name : patientData.hmo_tier_name,
      tierLevel: typeof tier === 'object' ? tier.level : patientData.hmo_tier_level,
      relationshipStatus: patientData.facility_hmo_relationship_status,
      systemHMO: typeof systemHMO === 'object' ? systemHMO : null,
      tier: typeof tier === 'object' ? tier : null,
    };
  }

  // Legacy HMO structure (backward compatibility)
  if (patientData.hmo) {
    const hmo = patientData.hmo;
    return {
      hasHMO: true,
      hmoName: typeof hmo === 'object' ? hmo.name : null,
      tierName: patientData.hmo_plan || null,
      tierLevel: null,
      relationshipStatus: patientData.hmo_relationship_status,
      systemHMO: null,
      tier: null,
    };
  }

  // No HMO
  return {
    hasHMO: false,
    hmoName: null,
    tierName: null,
    tierLevel: null,
    relationshipStatus: null,
  };
}

/**
 * HMO Badge Component - displays HMO name with relationship status colors
 */
function HMOBadge({ hmoName, relationshipStatus, tierName, tierLevel }) {
  if (!hmoName) {
    return <span className="text-xs text-slate-500">Self Pay</span>;
  }

  const hmoColors = getHMOStatusColors(relationshipStatus);
  const tierColors = tierLevel ? getTierColors(
    tierLevel === 1 ? 'GOLD' : tierLevel === 2 ? 'SILVER' : 'BRONZE'
  ) : null;

  return (
    <div className="flex flex-col gap-1">
      {/* HMO Name with relationship status colors */}
      <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${hmoColors.bgColor} ${hmoColors.textColor} ring-1 ${hmoColors.ringColor}`}>
        <Building2 className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">
          {hmoName}
        </span>
      </div>

      {/* Tier Badge (if available) */}
      {tierName && tierColors && (
        <div className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-medium ${tierColors.bgColor} ${tierColors.textColor} ring-1 ${tierColors.ringColor}`}>
          {tierLevel === 1 && <Award className="h-3 w-3" />}
          {tierLevel === 2 && <Star className="h-3 w-3" />}
          {tierLevel === 3 && <TrendingUp className="h-3 w-3" />}
          <span>{tierName}</span>
        </div>
      )}
    </div>
  );
}

function FacilityPharmacyPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Active tab state
  const [activeTab, setActiveTab] = useState("prescriptions");

  // Prescription filters
  const page = Number(searchParams.get("page") || 1) || 1;
  const limit = Number(searchParams.get("limit") || 20) || 20;
  const status = searchParams.get("status") || "";
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";
  const s = searchParams.get("s") || "";

  const [refreshKey, setRefreshKey] = useState(0);

  const { data, error, isLoading } = usePrescriptions({
    page,
    limit,
    status,
    start,
    end,
    s,
    refreshKey,
  });

  // User data
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  // Patients for lookup
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  // Stock data
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState(null);

  // Catalog data
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState("");

  // Modal state
  const [detailsId, setDetailsId] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Load user
  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to load current user");
        const json = await res.json();
        if (!cancelled) setMe(json);
      } catch (err) {
        console.error("Failed to fetch /accounts/me/:", err);
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const meRole = (me?.role || "").toUpperCase();
  const canDispense =
    meRole === "PHARMACY" || meRole === "ADMIN" || meRole === "SUPER_ADMIN";
  const canPrescribe =
    meRole === "PHARMACY" ||
    meRole === "ADMIN" ||
    meRole === "SUPER_ADMIN" ||
    meRole === "DOCTOR" ||
    meRole === "NURSE";
  const canManageCatalog =
    meRole === "PHARMACY" || meRole === "ADMIN" || meRole === "SUPER_ADMIN";

  // Load patients
  useEffect(() => {
    let cancelled = false;
    async function loadPatients() {
      try {
        setPatientsLoading(true);
        const res = await apiFetch("/patients/?page=1&limit=500");
        if (cancelled) return;
        setPatients(normaliseList(res));
      } catch (err) {
        console.error("Failed to load patients:", err);
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    }
    loadPatients();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load stock
  useEffect(() => {
    if (!me || !canManageCatalog) {
      setStockLoading(false);
      return;
    }

    let cancelled = false;
    async function loadStock() {
      setStockLoading(true);
      setStockError(null);
      try {
        const res = await fetch("/api/proxy/pharmacy/stock/", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load stock");
        const json = await res.json();
        if (!cancelled) setStock(normaliseList(json));
      } catch (err) {
        if (!cancelled) setStockError(err.message);
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    }
    loadStock();
    return () => {
      cancelled = true;
    };
  }, [me, canManageCatalog, refreshKey]);

  // Load catalog
  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      try {
        const res = await fetch("/api/proxy/pharmacy/catalog/", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load catalog");
        const json = await res.json();
        if (!cancelled) setCatalog(normaliseList(json));
      } catch (err) {
        console.error("Failed to load catalog:", err);
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [me, refreshKey]);

  // Normalise prescriptions
  const { rows, total } = normalisePrescriptionsPayload(data);

  // Build patientMap for quick lookup
  const patientMap = useMemo(() => {
    const m = new Map();
    patients.forEach((p) => {
      const name = [p.first_name, p.middle_name, p.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      m.set(p.id, { 
        name, 
        phone: p.phone,
        // Include HMO information in patient map
        system_hmo: p.system_hmo,
        hmo_tier: p.hmo_tier,
        system_hmo_name: p.system_hmo_name,
        hmo_tier_name: p.hmo_tier_name,
        hmo_tier_level: p.hmo_tier_level,
        facility_hmo_relationship_status: p.facility_hmo_relationship_status,
        // Legacy support
        hmo: p.hmo,
        hmo_plan: p.hmo_plan,
        hmo_relationship_status: p.hmo_relationship_status,
      });
    });
    return m;
  }, [patients]);

  // Build stockByDrugId map
  const stockByDrugId = useMemo(() => {
    const m = new Map();
    stock.forEach((s) => {
      if (s.drug?.id) {
        const existing = m.get(s.drug.id) || 0;
        m.set(s.drug.id, existing + Number(s.quantity || 0));
      }
    });
    return m;
  }, [stock]);

  // Filter catalog
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch) return catalog;
    const lower = catalogSearch.toLowerCase();
    return catalog.filter((d) => {
      return (
        d.name?.toLowerCase().includes(lower) ||
        d.code?.toLowerCase().includes(lower) ||
        d.form?.toLowerCase().includes(lower)
      );
    });
  }, [catalog, catalogSearch]);

  // Count prescriptions by status
  const prescriptionCounts = useMemo(() => {
    const counts = {
      prescribed: 0,
      partially: 0,
      dispensed: 0,
      total: rows.length,
    };
    rows.forEach((rx) => {
      const s = String(rx.status || "").toUpperCase();
      if (s === "PRESCRIBED") counts.prescribed++;
      else if (s === "PARTIALLY_DISPENSED") counts.partially++;
      else if (s === "DISPENSED") counts.dispensed++;
    });
    return counts;
  }, [rows]);

  // Count stock alerts
  const stockAlerts = useMemo(() => {
    let lowStock = 0;
    let outOfStock = 0;
    stock.forEach((s) => {
      const qty = Number(s.quantity || 0);
      if (qty === 0) outOfStock++;
      else if (qty <= 10) lowStock++;
    });
    return { lowStock, outOfStock };
  }, [stock]);

  const updateQuery = (updates) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) {
        current.set(k, v);
      } else {
        current.delete(k);
      }
    });
    if (updates.hasOwnProperty("page") && !updates.page) {
      current.set("page", "1");
    }
    if (
      !updates.hasOwnProperty("page") &&
      (updates.status !== undefined ||
        updates.start !== undefined ||
        updates.end !== undefined ||
        updates.s !== undefined)
    ) {
      current.set("page", "1");
    }
    router.push(`${pathname}?${current.toString()}`);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">
            Pharmacy workspace
          </h1>
          <p className="text-sm text-slate-600">
            Manage prescriptions, stock, and drug catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canPrescribe && (
            <Link
              href="/facility/pharmacy/prescribe"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              New prescription
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total prescriptions"
          value={prescriptionCounts.total}
          icon={ClipboardList}
          accent="from-sky-500 to-indigo-500"
        />
        <StatCard
          label="Prescribed"
          value={prescriptionCounts.prescribed}
          icon={Activity}
          accent="from-indigo-500 to-violet-500"
        />
        <StatCard
          label="Partially dispensed"
          value={prescriptionCounts.partially}
          icon={Pill}
          accent="from-violet-500 to-purple-500"
        />
        <StatCard
          label="Out of stock items"
          value={stockAlerts.outOfStock}
          icon={AlertTriangle}
          accent="from-rose-500 to-pink-500"
          warning={stockAlerts.outOfStock > 0}
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
        <TabButton
          active={activeTab === "prescriptions"}
          onClick={() => setActiveTab("prescriptions")}
          icon={ClipboardList}
        >
          Prescriptions
        </TabButton>
        {canManageCatalog && (
          <>
            <TabButton
              active={activeTab === "stock"}
              onClick={() => setActiveTab("stock")}
              icon={Boxes}
            >
              Stock
            </TabButton>
            <TabButton
              active={activeTab === "catalog"}
              onClick={() => setActiveTab("catalog")}
              icon={Package}
            >
              Catalog
            </TabButton>
          </>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "prescriptions" && (
        <PrescriptionsTab
          rows={rows}
          total={total}
          page={page}
          limit={limit}
          status={status}
          start={start}
          end={end}
          s={s}
          isLoading={isLoading}
          error={error}
          patientMap={patientMap}
          patientsLoading={patientsLoading}
          updateQuery={updateQuery}
          setDetailsId={setDetailsId}
          setDetailsOpen={setDetailsOpen}
          canDispense={canDispense}
          stockByDrugId={stockByDrugId}
        />
      )}
      {activeTab === "stock" && (
        <StockTab
          stock={stock}
          stockLoading={stockLoading}
          stockError={stockError}
        />
      )}
      {activeTab === "catalog" && (
        <CatalogTab
          filteredCatalog={filteredCatalog}
          catalogLoading={catalogLoading}
          catalogSearch={catalogSearch}
          setCatalogSearch={setCatalogSearch}
          stockByDrugId={stockByDrugId}
        />
      )}

      {/* Details modal */}
      <PrescriptionDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        id={detailsId}
        allowDispense={canDispense}
        onUpdated={() => setRefreshKey((k) => k + 1)}
      />
    </main>
  );
}

/* ─────────────── Tab Components ─────────────── */

function PrescriptionsTab({
  rows,
  total,
  page,
  limit,
  status,
  start,
  end,
  s,
  isLoading,
  error,
  patientMap,
  patientsLoading,
  updateQuery,
  setDetailsId,
  setDetailsOpen,
  canDispense,
  stockByDrugId,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

      {/* Filters */}
      <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filter prescriptions
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative w-full sm:w-64">
              <input
                type="search"
                placeholder="Search patient, drug, note…"
                defaultValue={s}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateQuery({ s: e.currentTarget.value });
                  }
                }}
                onBlur={(e) => updateQuery({ s: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-44"
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value })}
            >
              <option value="">All statuses</option>
              <option value="PRESCRIBED">Prescribed</option>
              <option value="PARTIALLY_DISPENSED">Partially dispensed</option>
              <option value="DISPENSED">Dispensed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <input
              type="date"
              value={start}
              onChange={(e) => updateQuery({ start: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
            />

            <input
              type="date"
              value={end}
              onChange={(e) => updateQuery({ end: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
            />

            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-32"
              value={String(limit)}
              onChange={(e) => updateQuery({ limit: e.target.value })}
            >
              <option value="10">Show 10</option>
              <option value="20">Show 20</option>
              <option value="50">Show 50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading && !rows.length ? (
        <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading prescriptions…
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-rose-700">{error.message}</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block lg:hidden">
            <div className="divide-y divide-slate-100">
              {rows.length ? (
                rows.map((rx) => {
                  const created = formatDateTime(rx.created_at);
                  const patientInfo = patientMap.get(rx.patient);
                  const patientLabel = patientsLoading
                    ? "Loading..."
                    : patientInfo
                    ? patientInfo.name
                    : rx.patient != null
                    ? `Patient #${rx.patient}`
                    : "—";

                  const hmoInfo = getPatientHMOInfo(patientInfo);

                  let hasLowStock = false;
                  let hasOutOfStock = false;

                  if (Array.isArray(rx.items)) {
                    for (const item of rx.items) {
                      if (item.drug?.id) {
                        const stockQty = stockByDrugId.get(item.drug.id) ?? 0;
                        const remaining = item.remaining || 0;
                        if (stockQty === 0 && remaining > 0) {
                          hasOutOfStock = true;
                        } else if (stockQty < remaining && remaining > 0) {
                          hasLowStock = true;
                        }
                      }
                    }
                  }

                  let itemsSummary = "—";
                  if (Array.isArray(rx.items) && rx.items.length) {
                    const names = rx.items
                      .map(
                        (it) =>
                          it.drug?.name ||
                          it.drug?.code ||
                          it.drug_name ||
                          it.dose ||
                          "Medication"
                      )
                      .filter(Boolean);
                    if (names.length <= 2) {
                      itemsSummary = names.join(", ");
                    } else {
                      itemsSummary = `${names.slice(0, 2).join(", ")} + ${
                        names.length - 2
                      } more`;
                    }
                  }

                  return (
                    <div key={rx.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {patientLabel}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {created}
                          </div>
                        </div>
                        <StatusPill value={rx.status} />
                      </div>

                      <div className="mt-3 text-xs text-slate-700">
                        {itemsSummary}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <HMOBadge
                          hmoName={hmoInfo.hmoName}
                          relationshipStatus={hmoInfo.relationshipStatus}
                          tierName={hmoInfo.tierName}
                          tierLevel={hmoInfo.tierLevel}
                        />
                        {hasOutOfStock ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                            <AlertTriangle className="h-3 w-3" />
                            Out of stock
                          </span>
                        ) : hasLowStock ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                            <TrendingDown className="h-3 w-3" />
                            Low stock
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Stock OK
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsId(rx.id);
                            setDetailsOpen(true);
                          }}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-sky-700 hover:border-sky-300 hover:bg-sky-50"
                        >
                          {canDispense ? "View & dispense" : "View"}
                        </button>
                        {canDispense && rx.patient && (
                          <Link
                            href={`/facility/billing?patient=${rx.patient}&prescription=${rx.id}`}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          >
                            Billing
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                    <Pill className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    No prescriptions found
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Adjust your filters or create a new prescription.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[980px] w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>Created</Th>
                  <Th>Patient</Th>
                  <Th>Insurance / HMO</Th>
                  <Th>Medications</Th>
                  <Th>Stock status</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.length ? (
                  rows.map((rx) => {
                    const created = formatDateTime(rx.created_at);
                    const patientInfo = patientMap.get(rx.patient);
                    const patientLabel = patientsLoading
                      ? "Loading…"
                      : patientInfo
                      ? patientInfo.name
                      : rx.patient != null
                      ? `Patient #${rx.patient}`
                      : "—";

                    // Extract HMO information from patient data
                    const hmoInfo = getPatientHMOInfo(patientInfo);

                    // Check stock availability for items
                    let hasLowStock = false;
                    let hasOutOfStock = false;

                    if (Array.isArray(rx.items)) {
                      for (const item of rx.items) {
                        if (item.drug?.id) {
                          const stockQty = stockByDrugId.get(item.drug.id) ?? 0;
                          const remaining = item.remaining || 0;
                          if (stockQty === 0 && remaining > 0) {
                            hasOutOfStock = true;
                          } else if (stockQty < remaining && remaining > 0) {
                            hasLowStock = true;
                          }
                        }
                      }
                    }

                    let itemsSummary = "—";
                    if (Array.isArray(rx.items) && rx.items.length) {
                      const names = rx.items
                        .map(
                          (it) =>
                            it.drug?.name ||
                            it.drug?.code ||
                            it.drug_name ||
                            it.dose ||
                            "Medication"
                        )
                        .filter(Boolean);
                      if (names.length <= 2) {
                        itemsSummary = names.join(", ");
                      } else {
                        itemsSummary = `${names.slice(0, 2).join(", ")} + ${
                          names.length - 2
                        } more`;
                      }
                    }

                    return (
                      <tr key={rx.id} className="transition hover:bg-slate-50/60">
                        <Td>
                          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {created}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs font-medium text-slate-900">
                            {patientLabel}
                          </span>
                          {patientInfo?.phone && (
                            <span className="ml-1 text-[11px] text-slate-500">
                              • {patientInfo.phone}
                            </span>
                          )}
                        </Td>
                        
                        {/* UPDATED: HMO Column with new system support */}
                        <Td>
                          <HMOBadge
                            hmoName={hmoInfo.hmoName}
                            relationshipStatus={hmoInfo.relationshipStatus}
                            tierName={hmoInfo.tierName}
                            tierLevel={hmoInfo.tierLevel}
                          />
                        </Td>
                        
                        <Td>
                          <span className="text-xs text-slate-700">
                            {itemsSummary}
                          </span>
                          {rx.items?.length > 0 && (
                            <span className="ml-1 text-[11px] text-slate-500">
                              ({rx.items.length} item{rx.items.length > 1 ? "s" : ""})
                            </span>
                          )}
                        </Td>
                        <Td>
                          {hasOutOfStock ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                              <AlertTriangle className="h-3 w-3" />
                              Out of stock
                            </span>
                          ) : hasLowStock ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                              <TrendingDown className="h-3 w-3" />
                              Low stock
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Stock OK
                            </span>
                          )}
                        </Td>
                        <Td>
                          <StatusPill value={rx.status} />
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailsId(rx.id);
                                setDetailsOpen(true);
                              }}
                              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-sky-700 hover:border-sky-300 hover:bg-sky-50"
                            >
                              {canDispense ? "View & dispense" : "View"}
                            </button>
                            {canDispense && rx.patient && (
                              <Link
                                href={`/facility/billing?patient=${rx.patient}&prescription=${rx.id}`}
                                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              >
                                Billing
                              </Link>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {page} · Showing {rows.length} of {total} prescription
              {total === 1 ? "" : "s"}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateQuery({ page: Math.max(1, page - 1) })}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                type="button"
                disabled={rows.length < limit}
                onClick={() => updateQuery({ page: page + 1 })}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 font-medium hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function StockTab({ stock, stockLoading, stockError }) {
  return (
    <section className="space-y-4">
      {/* Quick actions */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Stock management
          </h3>
          <p className="text-xs text-slate-500">
            Manage drug inventory and stock levels
          </p>
        </div>
        <Link
          href="/facility/pharmacy/stock"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
        >
          <Boxes className="h-4 w-4" />
          Manage stock
        </Link>
      </div>

      {/* Stock table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Current stock
          </h3>
          <p className="text-xs text-slate-500">
            {stock.length} stock item{stock.length !== 1 ? "s" : ""}
          </p>
        </div>

        {stockLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading stock…
          </div>
        ) : stockError ? (
          <div className="p-4 text-sm text-rose-700">{stockError}</div>
        ) : (
          <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
            <table className="min-w-[760px] w-full divide-y divide-slate-100 text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-700">
                <tr>
                  <Th>Batch</Th>
                  <Th>Drug</Th>
                  <Th>Quantity</Th>
                  <Th>Unit price</Th>
                  <Th>Expiry date</Th>
                  <Th>Supplier</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {stock.length ? (
                  stock.map((s) => {
                    const qty = Number(s.quantity || 0);
                    const lowStock = qty <= 10 && qty > 0;
                    const outOfStock = qty === 0;

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/70 transition"
                      >
                        <Td>
                          <span className="font-mono text-[11px] text-slate-700">
                            {s.batch_number || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs font-medium text-slate-900">
                            {s.drug?.name || s.drug?.code || "—"}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              outOfStock
                                ? "bg-rose-50 text-rose-700"
                                : lowStock
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {qty}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-medium text-slate-900">
                            ₦{Number(s.unit_price || 0).toLocaleString()}
                          </span>
                        </Td>
                        <Td>
                          {s.expiry_date ? (
                            <span className="text-xs text-slate-700">
                              {new Date(s.expiry_date).toLocaleDateString()}
                            </span>
                          ) : (
                            "—"
                          )}
                        </Td>
                        <Td>{s.supplier || "—"}</Td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-xs text-slate-500"
                    >
                      No stock items found. Add stock via stock management.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function CatalogTab({
  filteredCatalog,
  catalogLoading,
  catalogSearch,
  setCatalogSearch,
  stockByDrugId,
}) {
  return (
    <section className="space-y-4">
      {/* Quick actions */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Drug catalog
          </h3>
          <p className="text-xs text-slate-500">
            Browse your facility's drug catalog
          </p>
        </div>
        <Link
          href="/facility/pharmacy/catalog"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
        >
          <FileText className="h-4 w-4" />
          Manage catalog
        </Link>
      </div>

      {/* Catalog table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Available medications
              </h3>
              <p className="text-xs text-slate-500">
                {filteredCatalog.length} drug{filteredCatalog.length !== 1 ? "s" : ""} in catalog
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="search"
                placeholder="Search catalog…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {catalogLoading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading catalog…
          </div>
        ) : (
          <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
            <table className="min-w-[720px] w-full divide-y divide-slate-100 text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-700">
                <tr>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Strength</Th>
                  <Th>Form</Th>
                  <Th>Unit price</Th>
                  <Th>In stock</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCatalog.length ? (
                  filteredCatalog.map((d) => {
                    const stockQty = stockByDrugId.get(d.id) ?? 0;
                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-50/70 transition"
                      >
                        <Td>
                          <span className="font-mono text-[11px] text-slate-700">
                            {d.code}
                          </span>
                        </Td>
                        <Td>
                          <span className="text-xs font-medium text-slate-900">
                            {d.name}
                          </span>
                        </Td>
                        <Td>{d.strength || "—"}</Td>
                        <Td>{d.form || "—"}</Td>
                        <Td>
                          <span className="font-medium text-slate-900">
                            ₦{Number(d.unit_price || 0).toLocaleString()}
                          </span>
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              stockQty === 0
                                ? "bg-rose-50 text-rose-700"
                                : stockQty <= 10
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {stockQty}
                          </span>
                        </Td>
                      </tr>
                    );
                  })
                ) : catalogSearch ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-xs text-slate-500"
                    >
                      No drugs match "{catalogSearch}"
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-xs text-slate-500"
                    >
                      Catalog is empty. Add drugs in the catalog management page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────── UI Components ─────────────── */

function StatCard({ label, value, icon: Icon, accent, subtitle, warning }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className={`mt-1 text-2xl font-semibold ${warning ? 'text-amber-600' : 'text-slate-900'}`}>
            {value}
          </div>
          {subtitle && (
            <div className="mt-1 text-[11px] text-slate-500">{subtitle}</div>
          )}
        </div>
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${warning ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <Icon className={`h-5 w-5 ${warning ? 'text-amber-700' : 'text-slate-700'}`} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Th({ children }) {
  return (
    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td className="px-3 py-3 align-top text-xs text-slate-800">{children}</td>
  );
}

function StatusPill({ value }) {
  const v = String(value || "").toUpperCase();
  const label =
    v === "PARTIALLY_DISPENSED"
      ? "Partially dispensed"
      : v === "PRESCRIBED"
      ? "Prescribed"
      : v === "DISPENSED"
      ? "Dispensed"
      : v === "DRAFT"
      ? "Draft"
      : v === "CANCELLED"
      ? "Cancelled"
      : v || "Unknown";

  let cls = "bg-slate-50 text-slate-700 ring-slate-200";
  if (v === "PRESCRIBED") {
    cls = "bg-sky-50 text-sky-700 ring-sky-200";
  } else if (v === "PARTIALLY_DISPENSED") {
    cls = "bg-amber-50 text-amber-700 ring-amber-200";
  } else if (v === "DISPENSED") {
    cls = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  } else if (v === "CANCELLED") {
    cls = "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}
