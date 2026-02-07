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
  XCircle,
} from "lucide-react";
import PrescriptionDetailsModal from "@/components/pharmacy/PrescriptionDetailsModal";
import { apiFetch } from "@/lib/api";

export default function ProviderPharmacyPage(props) {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">Loading pharmacy...</div>
      }
    >
      <ProviderPharmacyPageInner {...props} />
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

function ProviderPharmacyPageInner() {
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

  const patient = searchParams.get("patient") || "";

  const [refreshKey, setRefreshKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);

  const { data, error, isLoading } = usePrescriptions({
    page,
    limit,
    status,
    patient,
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
  const providerType = (me?.provider?.provider_type || "").toUpperCase();
  const isPharmacyProvider = meRole === "PHARMACY" || providerType === "PHARMACIST";
  
  const canDispense = isPharmacyProvider;
  const canPrescribe = ["PHARMACY", "DOCTOR", "NURSE"].includes(meRole) || 
                       ["PHARMACIST", "DOCTOR", "NURSE"].includes(providerType);
  const canManageCatalog = isPharmacyProvider;

  async function handleCancelPrescription(rx) {
    const id = rx?.id;
    if (!id) return;

    const statusNorm = String(rx?.status || "").toUpperCase();
    if (statusNorm === "DISPENSED" || statusNorm === "PARTIALLY_DISPENSED") {
      alert("Dispensed prescriptions cannot be cancelled.");
      return;
    }

    if (Array.isArray(rx?.items) && rx.items.some((it) => Number(it?.qty_dispensed || 0) > 0)) {
      alert("This prescription already has dispensed items and cannot be cancelled.");
      return;
    }

    const ok = window.confirm(
      "Cancel this prescription? This will stop processing and it cannot be undone."
    );
    if (!ok) return;

    setCancellingId(id);
    try {
      const res = await fetch(`/api/proxy/pharmacy/prescriptions/${id}/cancel/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        let msg = "Failed to cancel prescription.";
        try {
          const body = await res.json();
          msg = body?.detail || body?.message || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err?.message || "Failed to cancel prescription.");
    } finally {
      setCancellingId(null);
    }
  }

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
  }, [refreshKey]);

  const { rows, total } = normalisePrescriptionsPayload(data);

  // Patient lookup map
  const patientMap = useMemo(() => {
    const map = new Map();
    for (const p of patients) {
      const name =
        p.full_name ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        null;
      map.set(p.id, {
        name: name || `Patient #${p.id}`,
        phone: p.phone || "",
      });
    }
    return map;
  }, [patients]);

  // Stock by drug ID
  const stockByDrugId = useMemo(() => {
    const m = new Map();
    for (const s of stock) {
      const drug = s.drug || {};
      if (drug.id != null) {
        m.set(drug.id, s.current_qty ?? 0);
      }
    }
    return m;
  }, [stock]);

  // Stock statistics
  const stockStats = useMemo(() => {
    let totalLines = stock.length;
    let totalQty = 0;
    let lowStock = 0;
    let outOfStock = 0;

    for (const s of stock) {
      const qty = Number(s.current_qty) || 0;
      totalQty += qty;
      if (qty === 0) outOfStock++;
      else if (qty <= 10) lowStock++;
    }

    return { totalLines, totalQty, lowStock, outOfStock };
  }, [stock]);

  // Prescription statistics
  const prescriptionStats = useMemo(() => {
    let pending = 0;
    let partiallyDispensed = 0;
    let dispensed = 0;

    for (const rx of rows) {
      const v = String(rx.status || "").toUpperCase();
      if (v === "PRESCRIBED") pending++;
      else if (v === "PARTIALLY_DISPENSED") partiallyDispensed++;
      else if (v === "DISPENSED") dispensed++;
    }

    const pendingOnPage = pending + partiallyDispensed;
    return { pending, partiallyDispensed, dispensed, total: rows.length };
  }, [rows]);

  // Filtered catalog for search
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return catalog;
    const q = catalogSearch.toLowerCase();
    return catalog.filter((d) => {
      return (
        d.code?.toLowerCase().includes(q) ||
        d.name?.toLowerCase().includes(q) ||
        d.strength?.toLowerCase().includes(q)
      );
    });
  }, [catalog, catalogSearch]);

  // Stock rows with search
  const stockRows = useMemo(() => {
    return stock
      .map((s) => {
        const drug = s.drug || {};
        return {
          id: s.id,
          drugId: drug.id,
          code: drug.code || "",
          name: drug.name || "",
          strength: drug.strength || "",
          form: drug.form || "",
          current_qty: s.current_qty ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stock]);

  function updateQuery(patch) {
    const params = new URLSearchParams(searchParams?.toString() || "");

    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    if (
      "status" in patch ||
      "s" in patch ||
      "start" in patch ||
      "end" in patch ||
      "limit" in patch
    ) {
      params.set("page", "1");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  if (meLoading) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Loading pharmacy workspace…
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      {/* Background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            <Pill className="h-3.5 w-3.5" />
            Independent Provider · Pharmacy
          </div>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Pharmacy workspace
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage prescriptions, track inventory, and dispense medications for your patients.
          </p>

          {patient && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={`/provider/patients/${patient}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to patient
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200">
                <Pill className="h-3.5 w-3.5" />
                Showing prescriptions for patient #{patient}
              </div>

              <button
                type="button"
                onClick={() => updateQuery({ patient: "" })}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {canPrescribe && (
            <Link
              href="/provider/pharmacy/new"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              New prescription
            </Link>
          )}
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending prescriptions"
          value={prescriptionStats.pending + prescriptionStats.partiallyDispensed}
          icon={ClipboardList}
          accent="from-sky-500 via-sky-600 to-sky-700"
          subtitle={`${prescriptionStats.pending} new, ${prescriptionStats.partiallyDispensed} partial`}
        />
        <StatCard
          label="Dispensed today"
          value={prescriptionStats.dispensed}
          icon={CheckCircle2}
          accent="from-emerald-500 via-emerald-600 to-emerald-700"
          subtitle="Completed prescriptions"
        />
        <StatCard
          label="Low stock items"
          value={stockStats.lowStock}
          icon={TrendingDown}
          accent="from-amber-500 via-amber-600 to-amber-700"
          subtitle={`${stockStats.outOfStock} out of stock`}
          warning={stockStats.lowStock > 0 || stockStats.outOfStock > 0}
        />
        <StatCard
          label="Catalog items"
          value={catalog.length}
          icon={Package}
          accent="from-slate-500 via-slate-600 to-slate-700"
          subtitle={`${stockStats.totalQty} units in stock`}
        />
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton
          active={activeTab === "prescriptions"}
          onClick={() => setActiveTab("prescriptions")}
          icon={ClipboardList}
        >
          Prescriptions
          {(prescriptionStats.pending + prescriptionStats.partiallyDispensed) > 0 && (
            <span className="ml-1.5 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
              {prescriptionStats.pending + prescriptionStats.partiallyDispensed}
            </span>
          )}
        </TabButton>
        {canManageCatalog && (
          <>
            <TabButton
              active={activeTab === "stock"}
              onClick={() => setActiveTab("stock")}
              icon={Boxes}
            >
              Stock levels
              {(stockStats.lowStock + stockStats.outOfStock) > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {stockStats.lowStock + stockStats.outOfStock}
                </span>
              )}
            </TabButton>
            <TabButton
              active={activeTab === "catalog"}
              onClick={() => setActiveTab("catalog")}
              icon={FileText}
            >
              Catalog
            </TabButton>
          </>
        )}
      </div>

      {/* Tab Content */}
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
          cancellingId={cancellingId}
          onCancelPrescription={handleCancelPrescription}
          stockByDrugId={stockByDrugId}
        />
      )}

      {activeTab === "stock" && canManageCatalog && (
        <StockTab
          stockRows={stockRows}
          stockLoading={stockLoading}
          stockError={stockError}
          stockStats={stockStats}
        />
      )}

      {activeTab === "catalog" && canManageCatalog && (
        <CatalogTab
          filteredCatalog={filteredCatalog}
          catalogLoading={catalogLoading}
          catalogSearch={catalogSearch}
          setCatalogSearch={setCatalogSearch}
          stockByDrugId={stockByDrugId}
        />
      )}

      {/* Prescription details modal */}
      <PrescriptionDetailsModal
        open={detailsOpen}
        id={detailsId}
        onClose={() => setDetailsOpen(false)}
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
  cancellingId,
  onCancelPrescription,
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
          <div className="flex flex-wrap gap-2">
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
          {/* Mobile + tablet cards */}
          <div className="lg:hidden space-y-3 p-4">
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
                  : "-";

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

                let itemsSummary = "-";
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
                  <div
                    key={rx.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {created}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {patientLabel}
                          {patientInfo?.phone && (
                            <span className="ml-1 text-[11px] text-slate-500">
                              - {patientInfo.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusPill value={rx.status} />
                    </div>

                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Medications
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          {itemsSummary}
                          {rx.items?.length > 0 && (
                            <span className="ml-1 text-[11px] text-slate-500">
                              ({rx.items.length} item{rx.items.length > 1 ? "s" : ""})
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Stock status
                        </div>
                        <div className="mt-1">
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
                      </div>
                    </div>

                    <div className="mt-4">
                      {(() => {
                        const statusNorm = String(rx?.status || "").toUpperCase();
                        const canCancel =
                          Boolean(canDispense) &&
                          (statusNorm === "PRESCRIBED" || statusNorm === "DRAFT") &&
                          !(Array.isArray(rx?.items) && rx.items.some((it) => Number(it?.qty_dispensed || 0) > 0));

                        return (
                          <div className="flex flex-wrap gap-2">
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

                            {canCancel && typeof onCancelPrescription === "function" && (
                              <button
                                type="button"
                                onClick={() => onCancelPrescription(rx)}
                                disabled={cancellingId === rx.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                              >
                                {cancellingId === rx.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5" />
                                )}
                                Cancel
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
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

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th>Created</Th>
                  <Th>Patient</Th>
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
                          {(() => {
                            const statusNorm = String(rx?.status || "").toUpperCase();
                            const canCancel =
                              Boolean(canDispense) &&
                              (statusNorm === "PRESCRIBED" || statusNorm === "DRAFT") &&
                              !(Array.isArray(rx?.items) && rx.items.some((it) => Number(it?.qty_dispensed || 0) > 0));

                            return (
                              <div className="flex flex-wrap gap-2">
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

                                {canCancel && typeof onCancelPrescription === "function" && (
                                  <button
                                    type="button"
                                    onClick={() => onCancelPrescription(rx)}
                                    disabled={cancellingId === rx.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                  >
                                    {cancellingId === rx.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <XCircle className="h-3.5 w-3.5" />
                                    )}
                                    Cancel
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </Td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-50">
                        <Pill className="h-6 w-6 text-slate-400" />
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        No prescriptions found
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Adjust your filters or create a new prescription.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <span>
              Page {page} · Showing {rows.length} of {total} prescription
              {total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
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

function StockTab({ stockRows, stockLoading, stockError, stockStats }) {
  return (
    <section className="space-y-4">
      {/* Quick actions */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Stock management
          </h3>
          <p className="text-xs text-slate-500">
            View current stock levels and manage inventory
          </p>
        </div>
        <Link
          href="/provider/pharmacy/stock"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
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
            Current stock levels
          </h3>
          <p className="text-xs text-slate-500">
            {stockStats.totalLines} items · {stockStats.totalQty} total units
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
          <>
            {/* Mobile + tablet cards */}
            <div className="lg:hidden space-y-3 p-4">
              {stockRows.length ? (
                stockRows.map((row) => {
                  const isOut = row.current_qty === 0;
                  const isLow = row.current_qty > 0 && row.current_qty <= 10;
                  return (
                    <div
                      key={row.id || row.drugId}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {row.name || "-"}
                          </div>
                          {row.code && (
                            <div className="mt-1 text-[11px] font-mono text-slate-500">
                              {row.code}
                            </div>
                          )}
                        </div>
                        <div>
                          {isOut ? (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              Out of stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              Low stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              In stock
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-700">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Strength
                          </div>
                          <div className="mt-1">{row.strength || "-"}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Form
                          </div>
                          <div className="mt-1">{row.form || "-"}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Current qty
                          </div>
                          <div className="mt-1 font-medium text-slate-900">
                            {row.current_qty ?? 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                  No stock records found. Add stock in the stock management page.
                </div>
              )}
            </div>

            <div className="hidden max-h-[500px] overflow-y-auto lg:block">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-700">
                <tr>
                  <Th>Drug</Th>
                  <Th>Strength</Th>
                  <Th>Form</Th>
                  <Th>Current qty</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {stockRows.length ? (
                  stockRows.map((row) => {
                    const isOut = row.current_qty === 0;
                    const isLow = row.current_qty > 0 && row.current_qty <= 10;
                    return (
                      <tr
                        key={row.id || row.drugId}
                        className="hover:bg-slate-50/70 transition"
                      >
                        <Td>
                          <span className="text-xs font-medium text-slate-900">
                            {row.name || "—"}
                          </span>
                          <span className="ml-1 font-mono text-[10px] text-slate-500">
                            {row.code ? `(${row.code})` : ""}
                          </span>
                        </Td>
                        <Td>{row.strength || "—"}</Td>
                        <Td>{row.form || "—"}</Td>
                        <Td>
                          <span className="font-medium text-slate-900">
                            {row.current_qty ?? 0}
                          </span>
                        </Td>
                        <Td>
                          {isOut ? (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              Out of stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              Low stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              In stock
                            </span>
                          )}
                        </Td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-xs text-slate-500"
                    >
                      No stock records found. Add stock in the stock management
                      page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
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
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Drug catalog
          </h3>
          <p className="text-xs text-slate-500">
            Browse and manage your drug catalog
          </p>
        </div>
        <Link
          href="/provider/pharmacy/catalog"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <FileText className="h-4 w-4" />
          Manage catalog
        </Link>
      </div>

      {/* Catalog table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Available medications
              </h3>
              <p className="text-xs text-slate-500">
                {filteredCatalog.length} drug{filteredCatalog.length !== 1 ? "s" : ""} in catalog
              </p>
            </div>
            <div className="relative w-full max-w-xs">
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
          <>
            {/* Mobile + tablet cards */}
            <div className="lg:hidden space-y-3 p-4">
              {filteredCatalog.length ? (
                filteredCatalog.map((d) => {
                  const stockQty = stockByDrugId.get(d.id) ?? 0;
                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {d.name}
                          </div>
                          {d.code && (
                            <div className="mt-1 text-[11px] font-mono text-slate-500">
                              {d.code}
                            </div>
                          )}
                        </div>
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
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-700">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Strength
                          </div>
                          <div className="mt-1">{d.strength || "-"}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Form
                          </div>
                          <div className="mt-1">{d.form || "-"}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Unit price
                          </div>
                          <div className="mt-1 font-medium text-slate-900">
                            ₦{Number(d.unit_price || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : catalogSearch ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                  No drugs match "{catalogSearch}"
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
                  Catalog is empty. Add drugs in the catalog management page.
                </div>
              )}
            </div>

            <div className="hidden max-h-[500px] overflow-y-auto lg:block">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
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
        </>
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
