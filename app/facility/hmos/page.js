"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Shield,
  Plus,
  RefreshCcw,
  ToggleLeft,
  ToggleRight,
  Trash2,
  AlertTriangle,
  Pill,
  Beaker,
  Upload,
  FileSpreadsheet,
  FileText,
  Info,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  Check,
  Search,
  Loader2,
  DollarSign,
  TrendingDown,
  Calendar,
  Eye,
  Award,
  Star,
  Building2,
  FileCheck,
  Handshake,
  Layers,
} from "lucide-react";
import AddHMOModal from "@/components/AddHMOModal";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.results && Array.isArray(payload.results)) return payload.results;
  if (typeof payload === "object") {
    const keys = Object.keys(payload);
    const isNumeric = keys.length && keys.every((k) => String(Number(k)) === k);
    if (isNumeric) return keys.sort((a, b) => Number(a) - Number(b)).map((k) => payload[k]);
  }
  return [];
}

// Tier badge component
function TierBadge({ tier }) {
  const config = {
    GOLD: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "🥇" },
    SILVER: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-600", icon: "🥈" },
    BRONZE: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: "🥉" },
  };
  const c = config[tier] || config.BRONZE;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.border} ${c.text}`}>
      <span>{c.icon}</span>
      {tier}
    </span>
  );
}

// Multi-tier badges component - shows all tiers for an HMO
function MultiTierBadges({ tiers }) {
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    return <span className="text-xs text-slate-400 italic">No tiers</span>;
  }

  // Sort tiers by level (GOLD=1, SILVER=2, BRONZE=3)
  const tierLevelMap = { 'GOLD': 1, 'SILVER': 2, 'BRONZE': 3 };
  const sortedTiers = [...tiers].sort((a, b) => {
    const levelA = tierLevelMap[a.name?.toUpperCase()] || 999;
    const levelB = tierLevelMap[b.name?.toUpperCase()] || 999;
    return levelA - levelB;
  });

  return (
    <div className="flex flex-wrap gap-1">
      {sortedTiers.map((tier) => (
        <TierBadge key={tier.id} tier={tier.name?.toUpperCase() || 'UNKNOWN'} />
      ))}
    </div>
  );
}

// Relationship status badge
function RelationshipBadge({ status }) {
  const config = {
    EXCELLENT: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
    GOOD: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    AVERAGE: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
    POOR: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
    BAD: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  };
  const c = config[status] || config.AVERAGE;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.border} ${c.text}`}>
      <Handshake className="h-3 w-3" />
      {status?.replace("_", " ") || "N/A"}
    </span>
  );
}

export default function EnhancedHMOPage() {
  const [me, setMe] = useState(null);
  const [activeTab, setActiveTab] = useState("hmos"); // hmos | pharmacy | labs | appointments

  // HMO management state - now stores FacilityHMO records
  const [hmos, setHmos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Pharmacy pricing state
  const [selectedPharmacyHMO, setSelectedPharmacyHMO] = useState("");
  const [selectedPharmacyTier, setSelectedPharmacyTier] = useState("");
  const [pharmacyCatalog, setPharmacyCatalog] = useState([]);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacySearch, setPharmacySearch] = useState("");
  const [editingDrugId, setEditingDrugId] = useState(null);
  const [editDrugPrice, setEditDrugPrice] = useState("");
  const [updatingDrug, setUpdatingDrug] = useState(false);

  // Lab pricing state
  const [selectedLabHMO, setSelectedLabHMO] = useState("");
  const [selectedLabTier, setSelectedLabTier] = useState("");
  const [labCatalog, setLabCatalog] = useState([]);
  const [labLoading, setLabLoading] = useState(false);
  const [labSearch, setLabSearch] = useState("");
  const [editingTestId, setEditingTestId] = useState(null);
  const [editTestPrice, setEditTestPrice] = useState("");
  const [updatingTest, setUpdatingTest] = useState(false);

  // Appointment pricing state
  const [selectedApptHMO, setSelectedApptHMO] = useState("");
  const [selectedApptTier, setSelectedApptTier] = useState("");
  const [apptCatalog, setApptCatalog] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptSearch, setApptSearch] = useState("");
  const [apptImportFile, setApptImportFile] = useState(null);
  const [apptImporting, setApptImporting] = useState(false);
  const [apptImportResult, setApptImportResult] = useState(null);
  const [editingApptId, setEditingApptId] = useState(null);
  const [editApptPrice, setEditApptPrice] = useState("");
  const [updatingAppt, setUpdatingAppt] = useState(false);

  // Import state (shared)
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");

  // Backend allows both SUPER_ADMIN and ADMIN to manage facility HMOs.
  const isSuperAdmin = useMemo(() => {
    const role = String(me?.role || "").toUpperCase();
    return role === "SUPER_ADMIN" || role === "ADMIN";
  }, [me]);
  
  // Active HMOs for pricing tabs - use system_hmo.id for API calls
  const activeHMOs = useMemo(() => {
    return hmos
      .filter((h) => h.is_active)
      .map((h) => ({
        // Use system_hmo.id for pricing API calls
        id: h.system_hmo?.id || h.id,
        facilityHmoId: h.id,
        name: h.system_hmo?.name || h.name,
        tiers: h.system_hmo?.tiers || [],
        tier_count: h.system_hmo?.tier_count || 0,
        nhis_number: h.system_hmo?.nhis_number,
      }));
  }, [hmos]);

  // Load current user and HMOs
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const meRes = await apiFetch("/accounts/me/");
        setMe(meRes);

        // Use new endpoint for facility HMOs
        const res = await apiFetch("/patients/hmo/facility/");
        setHmos(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load HMOs");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load pharmacy catalog when HMO selected
  useEffect(() => {
    if (!selectedPharmacyHMO || activeTab !== "pharmacy") return;

    async function loadPharmacy() {
      setPharmacyLoading(true);
      try {
        const url = selectedPharmacyTier
          ? `/pharmacy/catalog/hmo-catalog/?hmo_id=${selectedPharmacyHMO}&tier_id=${selectedPharmacyTier}`
          : `/pharmacy/catalog/hmo-catalog/?hmo_id=${selectedPharmacyHMO}`;
        const res = await apiFetch(url);
        setPharmacyCatalog(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load pharmacy catalog");
      } finally {
        setPharmacyLoading(false);
      }
    }
    loadPharmacy();
  }, [selectedPharmacyHMO, selectedPharmacyTier, activeTab]);

  // Load lab catalog when HMO selected
  useEffect(() => {
    if (!selectedLabHMO || activeTab !== "labs") return;

    async function loadLab() {
      setLabLoading(true);
      try {
        const url = selectedLabTier
          ? `/labs/catalog/hmo-catalog/?hmo_id=${selectedLabHMO}&tier_id=${selectedLabTier}`
          : `/labs/catalog/hmo-catalog/?hmo_id=${selectedLabHMO}`;
        const res = await apiFetch(url);
        setLabCatalog(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load lab catalog");
      } finally {
        setLabLoading(false);
      }
    }
    loadLab();
  }, [selectedLabHMO, selectedLabTier, activeTab]);

  // Load appointments catalog when HMO selected and tab active
  useEffect(() => {
    if (!selectedApptHMO || activeTab !== "appointments") return;

    async function loadAppt() {
      setApptLoading(true);
      try {
        const url = selectedApptTier
          ? `/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}&tier_id=${selectedApptTier}`
          : `/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}`;
        const res = await apiFetch(url);
        setApptCatalog(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load appointment catalog");
      } finally {
        setApptLoading(false);
      }
    }
    loadAppt();
  }, [selectedApptHMO, selectedApptTier, activeTab]);

  // Toggle active status for FacilityHMO
  async function toggleActive(hmo) {
    if (!hmo?.id) return;
    setBusy(true);
    setError("");
    try {
      // Use the backend toggle endpoint to avoid PATCH issues in some deployments.
      await apiFetch(`/patients/hmo/facility/${hmo.id}/toggle-active/`, {
        method: "POST",
      });
      const res = await apiFetch("/patients/hmo/facility/");
      setHmos(normalizeList(res));
    } catch (e) {
      setError(e?.message || "Failed to update HMO");
    } finally {
      setBusy(false);
    }
  }

  // Disable (remove) FacilityHMO relationship
  async function disableHmo(hmo) {
    if (!hmo?.id) return;
    const hmoName = hmo.system_hmo?.name || hmo.name || "this HMO";
    const ok = window.confirm(
      `Disable "${hmoName}" for this facility?\n\nThis will remove the HMO relationship and all facility-specific pricing. Patients enrolled in this HMO will need to be reassigned.`
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/patients/hmo/facility/${hmo.id}/`, { method: "DELETE" });
      const res = await apiFetch("/patients/hmo/facility/");
      setHmos(normalizeList(res));
    } catch (e) {
      setError(e?.message || "Failed to disable HMO");
    } finally {
      setBusy(false);
    }
  }

  async function handleModalSuccess() {
    setShowAddModal(false);
    const res = await apiFetch("/patients/hmo/facility/");
    setHmos(normalizeList(res));
  }

  // Pharmacy pricing functions
  function startEditDrugPrice(drug) {
    setEditingDrugId(drug.drug_id);
    setEditDrugPrice(String(drug.hmo_price || drug.catalog_price || ""));
  }

  function cancelEditDrugPrice() {
    setEditingDrugId(null);
    setEditDrugPrice("");
  }

  async function saveDrugPrice(drugId) {
    const priceValue = editDrugPrice.trim();
    if (!priceValue || isNaN(priceValue) || Number(priceValue) < 0) {
      setError("Please enter a valid price (0 or greater)");
      return;
    }

    setUpdatingDrug(true);
    setError("");

    try {
      await apiFetch("/pharmacy/catalog/set-hmo-price/", {
        method: "POST",
        body: JSON.stringify({
          hmo_id: Number(selectedPharmacyHMO),
          tier_id: selectedPharmacyTier || null,
          drug_id: drugId,
          amount: priceValue,
        }),
      });

      // Reload catalog
      const url = selectedPharmacyTier
        ? `/pharmacy/catalog/hmo-catalog/?hmo_id=${selectedPharmacyHMO}&tier_id=${selectedPharmacyTier}`
        : `/pharmacy/catalog/hmo-catalog/?hmo_id=${selectedPharmacyHMO}`;
      const res = await apiFetch(url);
      setPharmacyCatalog(normalizeList(res));
      
      setEditingDrugId(null);
      setEditDrugPrice("");
    } catch (e) {
      setError(e?.message || "Failed to update drug price");
    } finally {
      setUpdatingDrug(false);
    }
  }

  // Lab pricing functions
  function startEditTestPrice(test) {
    setEditingTestId(test.test_id);
    setEditTestPrice(String(test.hmo_price || test.catalog_price || ""));
  }

  function cancelEditTestPrice() {
    setEditingTestId(null);
    setEditTestPrice("");
  }

  async function saveTestPrice(testId) {
    const priceValue = editTestPrice.trim();
    if (!priceValue || isNaN(priceValue) || Number(priceValue) < 0) {
      setError("Please enter a valid price (0 or greater)");
      return;
    }

    setUpdatingTest(true);
    setError("");

    try {
      await apiFetch("/labs/catalog/set-hmo-price/", {
        method: "POST",
        body: JSON.stringify({
          hmo_id: Number(selectedLabHMO),
          tier_id: selectedLabTier || null,
          test_id: testId,
          amount: priceValue,
        }),
      });

      // Reload catalog
      const url = selectedLabTier
        ? `/labs/catalog/hmo-catalog/?hmo_id=${selectedLabHMO}&tier_id=${selectedLabTier}`
        : `/labs/catalog/hmo-catalog/?hmo_id=${selectedLabHMO}`;
      const res = await apiFetch(url);
      setLabCatalog(normalizeList(res));
      
      setEditingTestId(null);
      setEditTestPrice("");
    } catch (e) {
      setError(e?.message || "Failed to update test price");
    } finally {
      setUpdatingTest(false);
    }
  }

  // Appointment pricing functions
  function startApptEdit(service) {
    setEditingApptId(service.service_id);
    setEditApptPrice(String(service.hmo_price || service.catalog_price || ""));
  }

  function cancelApptEdit() {
    setEditingApptId(null);
    setEditApptPrice("");
  }

  async function saveApptPrice(serviceId) {
    const priceValue = editApptPrice.trim();
    if (!priceValue || isNaN(priceValue) || Number(priceValue) < 0) {
      setError("Please enter a valid price (0 or greater)");
      return;
    }

    setUpdatingAppt(true);
    setError("");

    try {
      await apiFetch("/appointments/set-hmo-price/", {
        method: "POST",
        body: JSON.stringify({
          hmo_id: Number(selectedApptHMO),
          tier_id: selectedApptTier || null,
          service_id: serviceId,
          amount: priceValue,
        }),
      });

      // Reload catalog
      const url = selectedApptTier
        ? `/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}&tier_id=${selectedApptTier}`
        : `/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}`;
      const res = await apiFetch(url);
      setApptCatalog(normalizeList(res));
      
      setEditingApptId(null);
      setEditApptPrice("");
    } catch (e) {
      setError(e?.message || "Failed to update appointment price");
    } finally {
      setUpdatingAppt(false);
    }
  }

  // Import function (shared - pharmacy & lab)
  async function handleImport(e, type) {
    e.preventDefault();
    if (!importFile) {
      setImportError("Please select a file to import.");
      return;
    }

    const hmoId = type === "pharmacy" ? selectedPharmacyHMO : selectedLabHMO;
    const tierId = type === "pharmacy" ? selectedPharmacyTier : selectedLabTier;
    if (!hmoId) {
      setImportError("Please select an HMO first.");
      return;
    }

    setImportError("");
    setImportResult(null);
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const endpoint = type === "pharmacy" 
        ? `/pharmacy/catalog/import-hmo-file/?hmo_id=${hmoId}${tierId ? `&tier_id=${tierId}` : ""}`
        : `/labs/catalog/import-hmo-file/?hmo_id=${hmoId}${tierId ? `&tier_id=${tierId}` : ""}`;

      const res = await fetch(`/api/proxy${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let msg = `Import failed (${res.status})`;
        try {
          const err = await res.json();
          if (err && err.detail) msg = err.detail;
        } catch {}
        throw new Error(msg);
      }

      const result = await res.json();
      setImportResult(result);
      
      // Reload catalog
      if (type === "pharmacy") {
        const url = selectedPharmacyTier
          ? `/pharmacy/catalog/hmo-catalog/?hmo_id=${hmoId}&tier_id=${selectedPharmacyTier}`
          : `/pharmacy/catalog/hmo-catalog/?hmo_id=${hmoId}`;
        const catalog = await apiFetch(url);
        setPharmacyCatalog(normalizeList(catalog));
      } else {
        const url = selectedLabTier
          ? `/labs/catalog/hmo-catalog/?hmo_id=${hmoId}&tier_id=${selectedLabTier}`
          : `/labs/catalog/hmo-catalog/?hmo_id=${hmoId}`;
        const catalog = await apiFetch(url);
        setLabCatalog(normalizeList(catalog));
      }
      
      setImportFile(null);
    } catch (err) {
      setImportError(err?.message || "Failed to import file");
    } finally {
      setImporting(false);
    }
  }

  // Appointment import
  async function handleApptImport(e) {
    e.preventDefault();
    if (!apptImportFile) {
      setApptImportResult(null);
      setError("Please select a file to import.");
      return;
    }
    if (!selectedApptHMO) {
      setApptImportResult(null);
      setError("Please select an HMO first.");
      return;
    }

    setError("");
    setApptImportResult(null);
    setApptImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", apptImportFile);

      const endpoint = `/appointments/import-hmo-file/?hmo_id=${selectedApptHMO}${selectedApptTier ? `&tier_id=${selectedApptTier}` : ""}`;
      const res = await fetch(`/api/proxy${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let msg = `Import failed (${res.status})`;
        try {
          const err = await res.json();
          if (err && err.detail) msg = err.detail;
        } catch {}
        throw new Error(msg);
      }

      const result = await res.json();
      setApptImportResult(result);

      // reload appt catalog
      const url = selectedApptTier
        ? `/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}&tier_id=${selectedApptTier}`
        : `/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}`;
      const catalog = await apiFetch(url);
      setApptCatalog(normalizeList(catalog));

      setApptImportFile(null);
    } catch (err) {
      setApptImportResult({ errors: [err?.message || "Failed to import file"] });
    } finally {
      setApptImporting(false);
    }
  }

  const filteredPharmacyCatalog = useMemo(() => {
    const q = pharmacySearch.trim().toLowerCase();
    if (!q) return pharmacyCatalog;
    return pharmacyCatalog.filter((d) => {
      return (
        d.drug_code?.toLowerCase().includes(q) ||
        d.drug_name?.toLowerCase().includes(q) ||
        d.strength?.toLowerCase().includes(q)
      );
    });
  }, [pharmacyCatalog, pharmacySearch]);

  const filteredLabCatalog = useMemo(() => {
    const q = labSearch.trim().toLowerCase();
    if (!q) return labCatalog;
    return labCatalog.filter((t) => {
      return (
        t.test_code?.toLowerCase().includes(q) ||
        t.test_name?.toLowerCase().includes(q)
      );
    });
  }, [labCatalog, labSearch]);

  const filteredApptCatalog = useMemo(() => {
    const q = apptSearch.trim().toLowerCase();
    if (!q) return apptCatalog;
    return apptCatalog.filter((item) => {
      return (
        item.service_code?.toLowerCase().includes(q) ||
        item.service_name?.toLowerCase().includes(q)
      );
    });
  }, [apptCatalog, apptSearch]);

  const fileExtension = importFile ? importFile.name.split('.').pop().toLowerCase() : '';
  const isValidFile = ['csv', 'xlsx', 'xls'].includes(fileExtension);

  const apptFileExtension = apptImportFile ? apptImportFile.name.split('.').pop().toLowerCase() : '';
  const apptIsValidFile = ['csv', 'xlsx', 'xls'].includes(apptFileExtension);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">HMO Management</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Enable and manage health insurance plans from the system catalog. Configure HMO-specific pricing for services.
          </p>
        </div>

        <button
          onClick={async () => {
            const res = await apiFetch("/patients/hmo/facility/");
            setHmos(normalizeList(res));
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={loading || busy}
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Error</p>
            <p className="mt-1 text-xs text-red-800">{error}</p>
          </div>
          <button onClick={() => setError("")} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm md:flex-nowrap md:gap-1">
        <TabButton
          active={activeTab === "hmos"}
          onClick={() => setActiveTab("hmos")}
          icon={Shield}
        >
          HMOs
          <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            {hmos.length}
          </span>
        </TabButton>
        <TabButton
          active={activeTab === "pharmacy"}
          onClick={() => setActiveTab("pharmacy")}
          icon={Pill}
        >
          Pharmacy Pricing
        </TabButton>
        <TabButton
          active={activeTab === "labs"}
          onClick={() => setActiveTab("labs")}
          icon={Beaker}
        >
          Lab Pricing
        </TabButton>
        <TabButton
          active={activeTab === "appointments"}
          onClick={() => setActiveTab("appointments")}
          icon={Calendar}
        >
          Services
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === "hmos" && (
        <HMOsTab
          hmos={hmos}
          loading={loading}
          isSuperAdmin={isSuperAdmin}
          busy={busy}
          toggleActive={toggleActive}
          disableHmo={disableHmo}
          onAddClick={() => setShowAddModal(true)}
        />
      )}

      {activeTab === "pharmacy" && (
        <PharmacyPricingTab
          activeHMOs={activeHMOs}
          selectedHMO={selectedPharmacyHMO}
          setSelectedHMO={setSelectedPharmacyHMO}
          selectedTier={selectedPharmacyTier}
          setSelectedTier={setSelectedPharmacyTier}
          catalog={filteredPharmacyCatalog}
          catalogLoading={pharmacyLoading}
          search={pharmacySearch}
          setSearch={setPharmacySearch}
          editingId={editingDrugId}
          editPrice={editDrugPrice}
          setEditPrice={setEditDrugPrice}
          startEdit={startEditDrugPrice}
          cancelEdit={cancelEditDrugPrice}
          savePrice={saveDrugPrice}
          updating={updatingDrug}
          importFile={importFile}
          setImportFile={setImportFile}
          importing={importing}
          importResult={importResult}
          importError={importError}
          setImportError={setImportError}
          handleImport={(e) => handleImport(e, "pharmacy")}
          isValidFile={isValidFile}
          fileExtension={fileExtension}
        />
      )}

      {activeTab === "labs" && (
        <LabPricingTab
          activeHMOs={activeHMOs}
          selectedHMO={selectedLabHMO}
          setSelectedHMO={setSelectedLabHMO}
          selectedTier={selectedLabTier}
          setSelectedTier={setSelectedLabTier}
          catalog={filteredLabCatalog}
          catalogLoading={labLoading}
          search={labSearch}
          setSearch={setLabSearch}
          editingId={editingTestId}
          editPrice={editTestPrice}
          setEditPrice={setEditTestPrice}
          startEdit={startEditTestPrice}
          cancelEdit={cancelEditTestPrice}
          savePrice={saveTestPrice}
          updating={updatingTest}
          importFile={importFile}
          setImportFile={setImportFile}
          importing={importing}
          importResult={importResult}
          importError={importError}
          setImportError={setImportError}
          handleImport={(e) => handleImport(e, "labs")}
          isValidFile={isValidFile}
          fileExtension={fileExtension}
        />
      )}

      {activeTab === "appointments" && (
        <AppointmentPricingTab
          activeHMOs={activeHMOs}
          selectedHMO={selectedApptHMO}
          setSelectedHMO={setSelectedApptHMO}
          selectedTier={selectedApptTier}
          setSelectedTier={setSelectedApptTier}
          catalog={filteredApptCatalog}
          catalogLoading={apptLoading}
          search={apptSearch}
          setSearch={setApptSearch}
          editingId={editingApptId}
          editPrice={editApptPrice}
          setEditPrice={setEditApptPrice}
          startEdit={startApptEdit}
          cancelEdit={cancelApptEdit}
          savePrice={saveApptPrice}
          updating={updatingAppt}
          importFile={apptImportFile}
          setImportFile={setApptImportFile}
          importing={apptImporting}
          importResult={apptImportResult}
          isValidFile={apptIsValidFile}
          fileExtension={apptFileExtension}
          handleImport={handleApptImport}
        />
      )}

      {/* Add HMO Modal */}
      <AddHMOModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

// Tab Components
function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition md:px-4 md:py-2.5 md:text-sm ${
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

function HMOsTab({ hmos, loading, isSuperAdmin, busy, toggleActive, disableHmo, onAddClick }) {
  // Calculate stats
  const activeCount = hmos.filter(h => h.is_active).length;
  const inactiveCount = hmos.length - activeCount;
  
  // Count total tiers across all HMOs
  const tierStats = useMemo(() => {
    const stats = { total: 0, byType: { GOLD: 0, SILVER: 0, BRONZE: 0 } };
    
    hmos.forEach(h => {
      const tiers = h.system_hmo?.tiers || [];
      tiers.forEach(tier => {
        stats.total++;
        const tierName = tier.name?.toUpperCase();
        if (tierName in stats.byType) {
          stats.byType[tierName]++;
        }
      });
    });
    
    return stats;
  }, [hmos]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5 transition hover:shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-100">
              <Shield className="h-6 w-6 text-blue-700" />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-900">{hmos.length}</div>
          <div className="text-sm font-medium text-blue-700">Enabled HMOs</div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 transition hover:shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-700" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-900">{activeCount}</div>
          <div className="text-sm font-medium text-emerald-700">Active Plans</div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 transition hover:shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-100">
              <Layers className="h-6 w-6 text-purple-700" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-900">{tierStats.total}</div>
          <div className="text-sm font-medium text-purple-700">Total Tiers</div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-purple-600">
            <span>🥇 {tierStats.byType.GOLD}</span>
            <span>🥈 {tierStats.byType.SILVER}</span>
            <span>🥉 {tierStats.byType.BRONZE}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 transition hover:shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100">
              <ToggleLeft className="h-6 w-6 text-slate-700" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{inactiveCount}</div>
          <div className="text-sm font-medium text-slate-700">Disabled</div>
        </div>
      </div>

      {/* Info Panel */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100">
            <Info className="h-4 w-4 text-blue-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900">System HMO Workflow</h3>
            <div className="mt-2 space-y-1 text-xs text-blue-800">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">1</div>
                <div>Enable HMO plans from the system-wide catalog (NHIS, Hygeia, AXA Mansard, etc.)</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">2</div>
                <div>Configure facility-specific pricing in Pharmacy, Lab, and Services tabs</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">3</div>
                <div>Enroll patients to HMO plans via Patient Details → Insurance tab</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">4</div>
                <div>Billing automatically applies HMO-negotiated prices for enrolled patients</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HMO Management */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Enabled HMOs</h2>
              <p className="text-xs text-slate-600">
                {isSuperAdmin 
                  ? "Enable HMOs from the system catalog or manage existing relationships" 
                  : "View enabled HMO plans (Admin access required for editing)"}
              </p>
            </div>

            {isSuperAdmin && (
              <button
                onClick={onAddClick}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-60 disabled:shadow-none"
              >
                <Plus className="h-4 w-4" />
                Enable HMO
              </button>
            )}
          </div>
        </div>

        <div className="md:hidden">
          {loading ? (
            <div className="px-4 py-10 text-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <p className="text-sm text-slate-500">Loading HMOs...</p>
              </div>
            </div>
          ) : hmos.length ? (
            <div className="space-y-3 p-4">
              {hmos.map((h) => {
                const systemHmo = h.system_hmo || {};
                const hmoName = systemHmo.name || h.name || "Unknown HMO";
                const tiers = systemHmo.tiers || [];
                const nhisNumber = systemHmo.nhis_number;
                const hmoCode = systemHmo.hmo_code;

                return (
                  <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-xl ${
                        h.is_active
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{hmoName}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {hmoCode && <span className="font-mono">{hmoCode}</span>}
                          {nhisNumber && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                              NHIS: {nhisNumber}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <MultiTierBadges tiers={tiers} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <RelationshipBadge status={h.relationship_status} />
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                            h.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                          }`}>
                            {h.is_active ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {h.is_active ? "Active" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-600">
                      {h.contract_reference ? (
                        <div>
                          <div className="flex items-center gap-1 font-medium text-slate-700">
                            <FileCheck className="h-3 w-3" />
                            {h.contract_reference}
                          </div>
                          {(h.contract_start_date || h.contract_end_date) && (
                            <div className="mt-0.5 text-slate-500">
                              {h.contract_start_date && new Date(h.contract_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {h.contract_start_date && h.contract_end_date && " â€“ "}
                              {h.contract_end_date && new Date(h.contract_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">No contract</span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      <a
                        href={`/facility/hmos/${h.id}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </a>
                      <button
                        onClick={() => toggleActive(h)}
                        disabled={!isSuperAdmin || busy}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {h.is_active ? (
                          <>
                            <ToggleRight className="h-4 w-4" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4" />
                            Enable
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => disableHmo(h)}
                        disabled={!isSuperAdmin || busy}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                  <Shield className="h-8 w-8 text-slate-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-slate-900">No HMOs enabled</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {isSuperAdmin
                      ? "Enable HMOs from the system catalog to get started"
                      : "Contact your admin to enable HMO plans"}
                  </p>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={onAddClick}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Enable HMO
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">HMO</th>
                <th className="px-4 py-3">Available Tiers</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-sm text-slate-500">Loading HMOs...</p>
                    </div>
                  </td>
                </tr>
              ) : hmos.length ? (
                hmos.map((h) => {
                  const systemHmo = h.system_hmo || {};
                  const hmoName = systemHmo.name || h.name || "Unknown HMO";
                  const tiers = systemHmo.tiers || [];
                  const nhisNumber = systemHmo.nhis_number;
                  const hmoCode = systemHmo.hmo_code;
                  
                  return (
                    <tr key={h.id} className="group transition hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-10 w-10 place-items-center rounded-xl ${
                            h.is_active 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            <Shield className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{hmoName}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {hmoCode && <span className="font-mono">{hmoCode}</span>}
                              {nhisNumber && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                                  NHIS: {nhisNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <MultiTierBadges tiers={tiers} />
                      </td>
                      <td className="px-4 py-4">
                        <RelationshipBadge status={h.relationship_status} />
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                          h.is_active 
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
                            : "border-slate-200 bg-slate-100 text-slate-700"
                        }`}>
                          {h.is_active ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {h.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {h.contract_reference ? (
                          <div className="text-xs">
                            <div className="flex items-center gap-1 font-medium text-slate-700">
                              <FileCheck className="h-3 w-3" />
                              {h.contract_reference}
                            </div>
                            {(h.contract_start_date || h.contract_end_date) && (
                              <div className="mt-0.5 text-slate-500">
                                {h.contract_start_date && new Date(h.contract_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                {h.contract_start_date && h.contract_end_date && " – "}
                                {h.contract_end_date && new Date(h.contract_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No contract</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/facility/hmos/${h.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </a>
                          <button
                            onClick={() => toggleActive(h)}
                            disabled={!isSuperAdmin || busy}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {h.is_active ? (
                              <>
                                <ToggleRight className="h-4 w-4" />
                                Disable
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4" />
                                Enable
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => disableHmo(h)}
                            disabled={!isSuperAdmin || busy}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                        <Shield className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-sm font-semibold text-slate-900">No HMOs enabled</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {isSuperAdmin 
                            ? "Enable HMOs from the system catalog to get started" 
                            : "Contact your admin to enable HMO plans"}
                        </p>
                      </div>
                      {isSuperAdmin && (
                        <button
                          onClick={onAddClick}
                          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4" />
                          Enable HMO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PharmacyPricingTab({
  activeHMOs,
  selectedHMO,
  setSelectedHMO,
  selectedTier,
  setSelectedTier,
  catalog,
  catalogLoading,
  search,
  setSearch,
  editingId,
  editPrice,
  setEditPrice,
  startEdit,
  cancelEdit,
  savePrice,
  updating,
  importFile,
  setImportFile,
  importing,
  importResult,
  importError,
  setImportError,
  handleImport,
  isValidFile,
  fileExtension,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      {/* Left column: Import */}
      <div className="space-y-4">
        <ImportSection
          title="Import Pharmacy Prices"
          subtitle="Upload CSV/Excel with drug prices for selected HMO"
          importFile={importFile}
          setImportFile={setImportFile}
          importing={importing}
          importResult={importResult}
          importError={importError}
          setImportError={setImportError}
          handleImport={handleImport}
          isValidFile={isValidFile}
          fileExtension={fileExtension}
          disabled={!selectedHMO}
          requiredColumns={["code", "price"]}
          optionalColumns={["name", "strength", "form", "route"]}
        />

        <InfoPanel
          title="File Format - Pharmacy"
          items={[
            { label: "code", desc: "Drug code (required)" },
            { label: "price", desc: "HMO price (required)" },
            { label: "name", desc: "Drug name (optional)" },
            { label: "strength", desc: "e.g., 500mg (optional)" },
            { label: "form", desc: "e.g., Tablet, Syrup (optional)" },
            { label: "route", desc: "e.g., Oral, IV (optional)" },
          ]}
        />
      </div>

      {/* Right column: Catalog */}
      <CatalogSection
        type="pharmacy"
        selectedHMO={selectedHMO}
        setSelectedHMO={setSelectedHMO}
        selectedTier={selectedTier}
        setSelectedTier={setSelectedTier}
        activeHMOs={activeHMOs}
        catalog={catalog}
        catalogLoading={catalogLoading}
        search={search}
        setSearch={setSearch}
        editingId={editingId}
        editPrice={editPrice}
        setEditPrice={setEditPrice}
        startEdit={startEdit}
        cancelEdit={cancelEdit}
        savePrice={savePrice}
        updating={updating}
      />
    </div>
  );
}

function LabPricingTab({
  activeHMOs,
  selectedHMO,
  setSelectedHMO,
  selectedTier,
  setSelectedTier,
  catalog,
  catalogLoading,
  search,
  setSearch,
  editingId,
  editPrice,
  setEditPrice,
  startEdit,
  cancelEdit,
  savePrice,
  updating,
  importFile,
  setImportFile,
  importing,
  importResult,
  importError,
  setImportError,
  handleImport,
  isValidFile,
  fileExtension,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      {/* Left column: Import */}
      <div className="space-y-4">
        <ImportSection
          title="Import Lab Prices"
          subtitle="Upload CSV/Excel with test prices for selected HMO"
          importFile={importFile}
          setImportFile={setImportFile}
          importing={importing}
          importResult={importResult}
          importError={importError}
          setImportError={setImportError}
          handleImport={handleImport}
          isValidFile={isValidFile}
          fileExtension={fileExtension}
          disabled={!selectedHMO}
          requiredColumns={["code", "price"]}
          optionalColumns={["name", "unit", "category"]}
        />

        <InfoPanel
          title="File Format - Lab"
          items={[
            { label: "code", desc: "Test code (required)" },
            { label: "price", desc: "HMO price (required)" },
            { label: "name", desc: "Test name (optional)" },
            { label: "unit", desc: "e.g., per test (optional)" },
            { label: "category", desc: "e.g., Hematology (optional)" },
          ]}
        />
      </div>

      {/* Right column: Catalog */}
      <CatalogSection
        type="lab"
        selectedHMO={selectedHMO}
        setSelectedHMO={setSelectedHMO}
        selectedTier={selectedTier}
        setSelectedTier={setSelectedTier}
        activeHMOs={activeHMOs}
        catalog={catalog}
        catalogLoading={catalogLoading}
        search={search}
        setSearch={setSearch}
        editingId={editingId}
        editPrice={editPrice}
        setEditPrice={setEditPrice}
        startEdit={startEdit}
        cancelEdit={cancelEdit}
        savePrice={savePrice}
        updating={updating}
      />
    </div>
  );
}

function AppointmentPricingTab({
  activeHMOs,
  selectedHMO,
  setSelectedHMO,
  selectedTier,
  setSelectedTier,
  catalog,
  catalogLoading,
  search,
  setSearch,
  editingId,
  editPrice,
  setEditPrice,
  startEdit,
  cancelEdit,
  savePrice,
  updating,
  importFile,
  setImportFile,
  importing,
  importResult,
  isValidFile,
  fileExtension,
  handleImport,
}) {
  // Get selected HMO data to access tiers
  const selectedHMOData = useMemo(() => {
    return activeHMOs.find(h => h.id === Number(selectedHMO));
  }, [selectedHMO, activeHMOs]);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
      {/* Left column: Import */}
      <div className="space-y-4">
        <ImportSection
          title="Import Service Prices"
          subtitle="Upload CSV/Excel with appointment prices for selected HMO"
          importFile={importFile}
          setImportFile={setImportFile}
          importing={importing}
          importResult={importResult}
          importError={null}
          setImportError={() => {}}
          handleImport={handleImport}
          isValidFile={isValidFile}
          fileExtension={fileExtension}
          disabled={!selectedHMO}
          requiredColumns={["code", "price"]}
          optionalColumns={["name", "duration", "category"]}
        />

        <InfoPanel
          title="File Format - Services"
          items={[
            { label: "code", desc: "Service code (required)" },
            { label: "price", desc: "HMO price (required)" },
            { label: "name", desc: "Service name (optional)" },
            { label: "duration", desc: "e.g., 30 mins (optional)" },
            { label: "category", desc: "e.g., Consultation (optional)" },
          ]}
        />
      </div>

      {/* Right column: Catalog */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Services Catalog</h2>
            <p className="text-xs text-slate-500">
              {catalog.length} service{catalog.length !== 1 ? "s" : ""} · Set HMO-specific prices
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 md:w-48"
              />
            </div>

            <select
              value={selectedHMO}
              onChange={(e) => {
                setSelectedHMO(e.target.value);
                setSelectedTier(""); // Reset tier when HMO changes
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Select HMO…</option>
              {activeHMOs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>

            {/* Tier Selection - Shows when HMO has multiple tiers */}
            {selectedHMO && selectedHMOData?.tiers?.length > 0 && (
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                title="Optional - Select a specific tier or leave empty for all tiers"
              >
                <option value="">All Tiers (HMO Default)</option>
                {selectedHMOData.tiers.map(tier => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} Tier
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {!selectedHMO ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            Please select an HMO to view and edit pricing
          </div>
        ) : catalogLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading catalog…
          </div>
        ) : catalog.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No services in catalog. Add appointment service types first.
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {catalog.map((item) => {
                const itemId = item.service_id;
                const code = item.service_code;
                const name = item.service_name;
                const catalogPrice = Number(item.catalog_price || 0);
                const hmoPrice = Number(item.hmo_price || catalogPrice);
                const discount = catalogPrice > 0
                  ? Math.round(((catalogPrice - hmoPrice) / catalogPrice) * 100)
                  : 0;

                return (
                  <div key={itemId} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{name || code}</div>
                        <div className="text-[11px] font-mono text-slate-500">{code}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          Duration: {item.duration || "â€”"}
                        </div>
                      </div>
                      <div className="text-right">
                        {discount !== 0 ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            discount > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}>
                            {discount > 0 ? <TrendingDown className="h-3 w-3" /> : null}
                            {discount > 0 ? "-" : "+"}{Math.abs(discount)}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">â€”</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-slate-500">Catalog</div>
                        <div className="font-semibold text-slate-900">
                          â‚¦{catalogPrice.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-500">HMO</div>
                        {editingId === itemId ? (
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") savePrice(itemId);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="w-24 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              autoFocus
                              disabled={updating}
                            />
                            <button
                              type="button"
                              onClick={() => savePrice(itemId)}
                              disabled={updating}
                              className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                              title="Save"
                            >
                              {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={updating}
                              className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                              title="Cancel"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <span className="font-semibold text-slate-900">
                              â‚¦{hmoPrice.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                              title="Edit price"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingId !== itemId && (
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
                      >
                        <DollarSign className="h-3 w-3" />
                        Edit Price
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-700">
                <tr>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2 text-right">Catalog Price</th>
                  <th className="px-3 py-2 text-right">HMO Price</th>
                  <th className="px-3 py-2 text-center">Discount</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {catalog.map((item) => {
                  const itemId = item.service_id;
                  const code = item.service_code;
                  const name = item.service_name;
                  const catalogPrice = Number(item.catalog_price || 0);
                  const hmoPrice = Number(item.hmo_price || catalogPrice);
                  const discount = catalogPrice > 0 
                    ? Math.round(((catalogPrice - hmoPrice) / catalogPrice) * 100)
                    : 0;

                  return (
                    <tr key={itemId} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{name || code}</div>
                        <div className="text-[11px] font-mono text-slate-500">{code}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{item.duration || "—"}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">
                        ₦{catalogPrice.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editingId === itemId ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") savePrice(itemId);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="w-24 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              autoFocus
                              disabled={updating}
                            />
                            <button
                              type="button"
                              onClick={() => savePrice(itemId)}
                              disabled={updating}
                              className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                              title="Save"
                            >
                              {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={updating}
                              className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                              title="Cancel"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-medium text-slate-900">
                              ₦{hmoPrice.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                              title="Edit price"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {discount !== 0 ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            discount > 0 
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}>
                            {discount > 0 ? <TrendingDown className="h-3 w-3" /> : null}
                            {discount > 0 ? "-" : "+"}{Math.abs(discount)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
                        >
                          <DollarSign className="h-3 w-3" />
                          Edit Price
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}

function ImportSection({
  title,
  subtitle,
  importFile,
  setImportFile,
  importing,
  importResult,
  importError,
  setImportError,
  handleImport,
  isValidFile,
  fileExtension,
  disabled,
  requiredColumns,
  optionalColumns,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <form onSubmit={handleImport} className="space-y-3">
        <div className="relative">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] || null);
              setImportError && setImportError("");
            }}
            className="sr-only"
            id={`import-file-${title.replace(/\s/g, "-")}`}
            disabled={disabled || importing}
          />
          <label
            htmlFor={`import-file-${title.replace(/\s/g, "-")}`}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm transition ${
              disabled
                ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                : importFile
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            {importFile ? (
              <>
                <FileSpreadsheet className="h-5 w-5" />
                <span className="font-medium">{importFile.name}</span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                  {fileExtension}
                </span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Choose CSV or Excel file</span>
              </>
            )}
          </label>
        </div>

        {disabled && (
          <p className="text-xs text-amber-600">Please select an HMO first</p>
        )}

        {importError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {importError}
          </div>
        )}

        {importResult && (
          <div className={`rounded-lg border p-2 text-xs ${
            importResult.errors?.length
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {importResult.created !== undefined && (
              <p><strong>{importResult.created}</strong> created</p>
            )}
            {importResult.updated !== undefined && (
              <p><strong>{importResult.updated}</strong> updated</p>
            )}
            {importResult.skipped !== undefined && (
              <p><strong>{importResult.skipped}</strong> skipped</p>
            )}
            {importResult.errors?.length > 0 && (
              <div className="mt-1">
                <p className="font-semibold">Errors:</p>
                <ul className="ml-3 list-disc">
                  {importResult.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>...and {importResult.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={disabled || !importFile || !isValidFile || importing}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none"
        >
          {importing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing…
            </span>
          ) : (
            "Import Prices"
          )}
        </button>
      </form>
    </section>
  );
}

function InfoPanel({ title, items }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-slate-600" />
        <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="space-y-1 text-[11px]">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <code className="rounded bg-white px-1 py-0.5 font-mono text-slate-700 border border-slate-200">
              {item.label}
            </code>
            <span className="text-slate-600">{item.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CatalogSection({
  type,
  selectedHMO,
  setSelectedHMO,
  selectedTier,
  setSelectedTier,
  activeHMOs,
  catalog,
  catalogLoading,
  search,
  setSearch,
  editingId,
  editPrice,
  setEditPrice,
  startEdit,
  cancelEdit,
  savePrice,
  updating,
}) {
  const isPharmacy = type === "pharmacy";
  
  // Get selected HMO data to access tiers
  const selectedHMOData = useMemo(() => {
    return activeHMOs.find(h => h.id === Number(selectedHMO));
  }, [selectedHMO, activeHMOs]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {isPharmacy ? "Pharmacy" : "Lab"} Catalog
          </h2>
          <p className="text-xs text-slate-500">
            {catalog.length} item{catalog.length !== 1 ? "s" : ""} · Set HMO-specific prices
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalog…"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 md:w-48"
            />
          </div>

          <select
            value={selectedHMO}
            onChange={(e) => {
              setSelectedHMO(e.target.value);
              setSelectedTier(""); // Reset tier when HMO changes
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select HMO…</option>
            {activeHMOs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          {/* Tier Selection - Shows when HMO has multiple tiers */}
          {selectedHMO && selectedHMOData?.tiers?.length > 0 && (
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              title="Optional - Select a specific tier or leave empty for all tiers"
            >
              <option value="">All Tiers (HMO Default)</option>
              {selectedHMOData.tiers.map(tier => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} Tier
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!selectedHMO ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          Please select an HMO to view and edit pricing
        </div>
      ) : catalogLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading catalog…
        </div>
      ) : catalog.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No items in catalog. Add items to your {isPharmacy ? "pharmacy" : "lab"} catalog first.
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {catalog.map((item) => {
              const itemId = isPharmacy ? item.drug_id : item.test_id;
              const code = isPharmacy ? item.drug_code : item.test_code;
              const name = isPharmacy ? item.drug_name : item.test_name;
              const catalogPrice = Number(item.catalog_price || 0);
              const hmoPrice = Number(item.hmo_price || catalogPrice);
              const discount = catalogPrice > 0
                ? Math.round(((catalogPrice - hmoPrice) / catalogPrice) * 100)
                : 0;
              const detailValue = isPharmacy ? item.strength : item.unit;
              const detailLabel = isPharmacy ? "Strength" : "Unit";

              return (
                <div key={itemId} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{name || code}</div>
                      <div className="text-[11px] font-mono text-slate-500">{code}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {detailLabel}: {detailValue || "â€”"}
                      </div>
                    </div>
                    <div className="text-right">
                      {discount !== 0 ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          discount > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}>
                          {discount > 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {discount > 0 ? "-" : "+"}{Math.abs(discount)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">â€”</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-slate-500">Catalog</div>
                      <div className="font-semibold text-slate-900">
                        â‚¦{catalogPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500">HMO</div>
                      {editingId === itemId ? (
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") savePrice(itemId);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="w-24 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            autoFocus
                            disabled={updating}
                          />
                          <button
                            type="button"
                            onClick={() => savePrice(itemId)}
                            disabled={updating}
                            className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            title="Save"
                          >
                            {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={updating}
                            className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <span className="font-semibold text-slate-900">
                            â‚¦{hmoPrice.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            title="Edit price"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {editingId !== itemId && (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-2 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
                    >
                      <DollarSign className="h-3 w-3" />
                      Edit Price
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-700">
              <tr>
                <th className="px-3 py-2">{isPharmacy ? "Drug" : "Test"}</th>
                {isPharmacy && <th className="px-3 py-2">Strength</th>}
                {!isPharmacy && <th className="px-3 py-2">Unit</th>}
                <th className="px-3 py-2 text-right">Catalog Price</th>
                <th className="px-3 py-2 text-right">HMO Price</th>
                <th className="px-3 py-2 text-center">Discount</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {catalog.map((item) => {
                const itemId = isPharmacy ? item.drug_id : item.test_id;
                const code = isPharmacy ? item.drug_code : item.test_code;
                const name = isPharmacy ? item.drug_name : item.test_name;
                const catalogPrice = Number(item.catalog_price || 0);
                const hmoPrice = Number(item.hmo_price || catalogPrice);
                const discount = catalogPrice > 0 
                  ? Math.round(((catalogPrice - hmoPrice) / catalogPrice) * 100)
                  : 0;

                return (
                  <tr key={itemId} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{name || code}</div>
                      <div className="text-[11px] font-mono text-slate-500">{code}</div>
                    </td>
                    {isPharmacy && (
                      <td className="px-3 py-2 text-slate-700">{item.strength || "—"}</td>
                    )}
                    {!isPharmacy && (
                      <td className="px-3 py-2 text-slate-700">{item.unit || "—"}</td>
                    )}
                    <td className="px-3 py-2 text-right font-medium text-slate-900">
                      ₦{catalogPrice.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editingId === itemId ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") savePrice(itemId);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="w-24 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            autoFocus
                            disabled={updating}
                          />
                          <button
                            type="button"
                            onClick={() => savePrice(itemId)}
                            disabled={updating}
                            className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            title="Save"
                          >
                            {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={updating}
                            className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-medium text-slate-900">
                            ₦{hmoPrice.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            title="Edit price"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {discount !== 0 ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          discount > 0 
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}>
                          {discount > 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {discount > 0 ? "-" : "+"}{Math.abs(discount)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
                      >
                        <DollarSign className="h-3 w-3" />
                        Edit Price
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
