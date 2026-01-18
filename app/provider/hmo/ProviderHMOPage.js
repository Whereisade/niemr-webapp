"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Shield,
  Plus,
  RefreshCcw,
  Pill,
  Beaker,
  Stethoscope,
  Upload,
  FileSpreadsheet,
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
  Award,
  Handshake,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
} from "lucide-react";
import AddHMOModal from "@/components/AddHMOModal";

function normalizeList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.results && Array.isArray(payload.results)) return payload.results;
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

// Multi-tier badges component
function MultiTierBadges({ tiers }) {
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    return <span className="text-xs text-slate-400 italic">No tiers</span>;
  }

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
    FAIR: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
    POOR: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
    BAD: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  };
  const c = config[status] || config.GOOD;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.border} ${c.text}`}>
      <Handshake className="h-3 w-3" />
      {status?.replace("_", " ") || "N/A"}
    </span>
  );
}

export default function ProviderHMOPage({ user }) {
  const role = useMemo(() => (user?.role || "").toUpperCase(), [user]);
  
  // Determine available tabs based on role
  const tabs = useMemo(() => {
    const baseTabs = [{ id: "hmos", label: "HMOs", icon: Shield }];
    
    if (role === "DOCTOR") {
      baseTabs.push({ id: "services", label: "Services", icon: Stethoscope });
    } else if (role === "LAB") {
      baseTabs.push({ id: "labs", label: "Lab Tests", icon: Beaker });
    } else if (role === "PHARMACY") {
      baseTabs.push({ id: "pharmacy", label: "Pharmacy", icon: Pill });
    }
    
    return baseTabs;
  }, [role]);

  const [activeTab, setActiveTab] = useState("hmos");
  
  // HMO management state
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

  // Services pricing state
  const [selectedServiceHMO, setSelectedServiceHMO] = useState("");
  const [selectedServiceTier, setSelectedServiceTier] = useState("");
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editServicePrice, setEditServicePrice] = useState("");
  const [updatingService, setUpdatingService] = useState(false);

  // Load HMOs on mount
  useEffect(() => {
    async function loadHMOs() {
      setLoading(true);
      setError("");
      try {
        // Backend automatically filters by owner for independent providers
        const res = await apiFetch("/patients/hmo/facility/");
        setHmos(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load HMOs");
      } finally {
        setLoading(false);
      }
    }
    loadHMOs();
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

  // Load services catalog when HMO selected
  useEffect(() => {
    if (!selectedServiceHMO || activeTab !== "services") return;

    async function loadServices() {
      setServiceLoading(true);
      try {
        const url = selectedServiceTier
          ? `/appointments/hmo-catalog/?hmo_id=${selectedServiceHMO}&tier_id=${selectedServiceTier}`
          : `/appointments/hmo-catalog/?hmo_id=${selectedServiceHMO}`;
        const res = await apiFetch(url);
        setServiceCatalog(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load services catalog");
      } finally {
        setServiceLoading(false);
      }
    }
    loadServices();
  }, [selectedServiceHMO, selectedServiceTier, activeTab]);

  // Disable HMO
  async function disableHMO(hmo) {
    if (!hmo?.id) return;
    if (!confirm(`Disable ${hmo.system_hmo?.name}?`)) return;
    
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

  // Reload HMOs after adding
  async function reloadHMOs() {
    const res = await apiFetch("/patients/hmo/facility/");
    setHmos(normalizeList(res));
  }

  // Save pharmacy price
  async function savePharmacyPrice(drugId) {
    if (!editDrugPrice || updatingDrug) return;
    
    setUpdatingDrug(true);
    try {
      await apiFetch("/pharmacy/catalog/set-hmo-price/", {
        method: "POST",
        body: JSON.stringify({
          hmo_id: selectedPharmacyHMO,
          tier_id: selectedPharmacyTier || null,
          drug_id: drugId,
          amount: editDrugPrice,
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
      setError(e?.message || "Failed to save price");
    } finally {
      setUpdatingDrug(false);
    }
  }

  // Save lab price
  async function saveLabPrice(testId) {
    if (!editTestPrice || updatingTest) return;
    
    setUpdatingTest(true);
    try {
      await apiFetch("/labs/catalog/set-hmo-price/", {
        method: "POST",
        body: JSON.stringify({
          hmo_id: selectedLabHMO,
          tier_id: selectedLabTier || null,
          test_id: testId,
          amount: editTestPrice,
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
      setError(e?.message || "Failed to save price");
    } finally {
      setUpdatingTest(false);
    }
  }

  // Save service price
  async function saveServicePrice(serviceId) {
    if (!editServicePrice || updatingService) return;
    
    setUpdatingService(true);
    try {
      await apiFetch("/appointments/set-hmo-price/", {
        method: "POST",
        body: JSON.stringify({
          hmo_id: selectedServiceHMO,
          tier_id: selectedServiceTier || null,
          service_id: serviceId,
          amount: editServicePrice,
        }),
      });

      // Reload catalog
      const url = selectedServiceTier
        ? `/appointments/hmo-catalog/?hmo_id=${selectedServiceHMO}&tier_id=${selectedServiceTier}`
        : `/appointments/hmo-catalog/?hmo_id=${selectedServiceHMO}`;
      const res = await apiFetch(url);
      setServiceCatalog(normalizeList(res));
      
      setEditingServiceId(null);
      setEditServicePrice("");
    } catch (e) {
      setError(e?.message || "Failed to save price");
    } finally {
      setUpdatingService(false);
    }
  }

  // Get selected HMO data for dropdowns
  const selectedHMOData = useMemo(() => {
    let hmoId = null;
    if (activeTab === "pharmacy") hmoId = selectedPharmacyHMO;
    if (activeTab === "labs") hmoId = selectedLabHMO;
    if (activeTab === "services") hmoId = selectedServiceHMO;
    
    return hmos.find(h => String(h.id) === String(hmoId));
  }, [hmos, selectedPharmacyHMO, selectedLabHMO, selectedServiceHMO, activeTab]);

  const availableTiers = useMemo(() => {
    return selectedHMOData?.system_hmo?.tiers || [];
  }, [selectedHMOData]);

  // Filter catalogs by search
  const filteredPharmacyCatalog = useMemo(() => {
    if (!pharmacySearch) return pharmacyCatalog;
    const s = pharmacySearch.toLowerCase();
    return pharmacyCatalog.filter(
      item => item.drug_name?.toLowerCase().includes(s) || item.drug_code?.toLowerCase().includes(s)
    );
  }, [pharmacyCatalog, pharmacySearch]);

  const filteredLabCatalog = useMemo(() => {
    if (!labSearch) return labCatalog;
    const s = labSearch.toLowerCase();
    return labCatalog.filter(
      item => item.test_name?.toLowerCase().includes(s) || item.test_code?.toLowerCase().includes(s)
    );
  }, [labCatalog, labSearch]);

  const filteredServiceCatalog = useMemo(() => {
    if (!serviceSearch) return serviceCatalog;
    const s = serviceSearch.toLowerCase();
    return serviceCatalog.filter(
      item => item.service_name?.toLowerCase().includes(s) || item.service_code?.toLowerCase().includes(s)
    );
  }, [serviceCatalog, serviceSearch]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">HMO Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your HMO relationships and pricing
          </p>
        </div>
        
        {activeTab === "hmos" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            Enable HMO
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError("")} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === "hmos" && (
          <HMOsTab 
            hmos={hmos}
            busy={busy}
            onDisable={disableHMO}
          />
        )}
        
        {activeTab === "pharmacy" && role === "PHARMACY" && (
          <PharmacyTab
            hmos={hmos}
            selectedHMO={selectedPharmacyHMO}
            setSelectedHMO={setSelectedPharmacyHMO}
            selectedTier={selectedPharmacyTier}
            setSelectedTier={setSelectedPharmacyTier}
            availableTiers={availableTiers}
            catalog={filteredPharmacyCatalog}
            loading={pharmacyLoading}
            search={pharmacySearch}
            setSearch={setPharmacySearch}
            editingId={editingDrugId}
            setEditingId={setEditingDrugId}
            editPrice={editDrugPrice}
            setEditPrice={setEditDrugPrice}
            updating={updatingDrug}
            onSave={savePharmacyPrice}
          />
        )}
        
        {activeTab === "labs" && role === "LAB" && (
          <LabTab
            hmos={hmos}
            selectedHMO={selectedLabHMO}
            setSelectedHMO={setSelectedLabHMO}
            selectedTier={selectedLabTier}
            setSelectedTier={setSelectedLabTier}
            availableTiers={availableTiers}
            catalog={filteredLabCatalog}
            loading={labLoading}
            search={labSearch}
            setSearch={setLabSearch}
            editingId={editingTestId}
            setEditingId={setEditingTestId}
            editPrice={editTestPrice}
            setEditPrice={setEditTestPrice}
            updating={updatingTest}
            onSave={saveLabPrice}
          />
        )}
        
        {activeTab === "services" && role === "DOCTOR" && (
          <ServicesTab
            hmos={hmos}
            selectedHMO={selectedServiceHMO}
            setSelectedHMO={setSelectedServiceHMO}
            selectedTier={selectedServiceTier}
            setSelectedTier={setSelectedServiceTier}
            availableTiers={availableTiers}
            catalog={filteredServiceCatalog}
            loading={serviceLoading}
            search={serviceSearch}
            setSearch={setServiceSearch}
            editingId={editingServiceId}
            setEditingId={setEditingServiceId}
            editPrice={editServicePrice}
            setEditPrice={setEditServicePrice}
            updating={updatingService}
            onSave={saveServicePrice}
          />
        )}
      </div>

      {/* Add HMO Modal */}
      <AddHMOModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={async () => {
          setShowAddModal(false);
          await reloadHMOs();
        }}
      />
    </div>
  );
}

// HMOs Tab Component
function HMOsTab({ hmos, busy, onDisable }) {
  if (hmos.length === 0) {
    return (
      <div className="py-12 text-center">
        <Shield className="mx-auto h-16 w-16 text-slate-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No HMOs Enabled</h3>
        <p className="mt-2 text-sm text-slate-600">
          Click "Enable HMO" above to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Enabled HMOs</h2>
        <span className="text-sm text-slate-600">{hmos.length} total</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {hmos.map((hmo) => (
          <HMOCard key={hmo.id} hmo={hmo} busy={busy} onDisable={onDisable} />
        ))}
      </div>
    </div>
  );
}

// HMO Card Component
function HMOCard({ hmo, busy, onDisable }) {
  const system_hmo = hmo.system_hmo || {};
  const tiers = system_hmo.tiers || [];

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-white to-sky-50/30 shadow-sm transition hover:shadow-md">
      <div className="bg-sky-50 p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">
              {system_hmo.name || "Unnamed HMO"}
            </h3>
            {system_hmo.nhis_number && (
              <p className="mt-1 text-xs font-mono text-slate-600">
                NHIS: {system_hmo.nhis_number}
              </p>
            )}
          </div>
          <Shield className="h-6 w-6 text-sky-600" />
        </div>

        {tiers.length > 0 && <MultiTierBadges tiers={tiers} />}
      </div>

      <div className="space-y-3 p-5">
        {(hmo.email || system_hmo.email) && (
          <div className="flex items-start gap-2 text-sm">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="text-slate-700">{hmo.email || system_hmo.email}</span>
          </div>
        )}
        
        {((hmo.contact_numbers && hmo.contact_numbers.length > 0) || 
          (system_hmo.contact_numbers && system_hmo.contact_numbers.length > 0)) && (
          <div className="flex items-start gap-2 text-sm">
            <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="text-slate-700">
              {(hmo.contact_numbers && hmo.contact_numbers[0]) || system_hmo.contact_numbers[0]}
            </span>
          </div>
        )}

        {hmo.relationship_status && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <RelationshipBadge status={hmo.relationship_status} />
          </div>
        )}

        {hmo.contract_end_date && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar className="h-3 w-3" />
            Contract ends: {new Date(hmo.contract_end_date).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex justify-between">
        <div className="text-xs text-slate-600">
          {hmo.is_active ? "Active" : "Inactive"}
        </div>
        <button
          onClick={() => onDisable(hmo)}
          disabled={busy}
          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Disable
        </button>
      </div>
    </div>
  );
}

// Pharmacy Tab Component
function PharmacyTab({ 
  hmos, selectedHMO, setSelectedHMO, selectedTier, setSelectedTier,
  availableTiers, catalog, loading, search, setSearch,
  editingId, setEditingId, editPrice, setEditPrice, updating, onSave
}) {
  return (
    <PricingTab
      hmos={hmos}
      selectedHMO={selectedHMO}
      setSelectedHMO={setSelectedHMO}
      selectedTier={selectedTier}
      setSelectedTier={setSelectedTier}
      availableTiers={availableTiers}
      catalog={catalog}
      loading={loading}
      search={search}
      setSearch={setSearch}
      editingId={editingId}
      setEditingId={setEditingId}
      editPrice={editPrice}
      setEditPrice={setEditPrice}
      updating={updating}
      onSave={onSave}
      title="Pharmacy Pricing"
      description="Set HMO-specific pricing for your medications"
      searchPlaceholder="Search drugs..."
      idField="drug_id"
      nameField="drug_name"
      codeField="drug_code"
      extraFields={["strength", "form"]}
    />
  );
}

// Lab Tab Component
function LabTab({
  hmos, selectedHMO, setSelectedHMO, selectedTier, setSelectedTier,
  availableTiers, catalog, loading, search, setSearch,
  editingId, setEditingId, editPrice, setEditPrice, updating, onSave
}) {
  return (
    <PricingTab
      hmos={hmos}
      selectedHMO={selectedHMO}
      setSelectedHMO={setSelectedHMO}
      selectedTier={selectedTier}
      setSelectedTier={setSelectedTier}
      availableTiers={availableTiers}
      catalog={catalog}
      loading={loading}
      search={search}
      setSearch={setSearch}
      editingId={editingId}
      setEditingId={setEditingId}
      editPrice={editPrice}
      setEditPrice={setEditPrice}
      updating={updating}
      onSave={onSave}
      title="Lab Pricing"
      description="Set HMO-specific pricing for your lab tests"
      searchPlaceholder="Search tests..."
      idField="test_id"
      nameField="test_name"
      codeField="test_code"
      extraFields={["unit"]}
    />
  );
}

// Services Tab Component
function ServicesTab({
  hmos, selectedHMO, setSelectedHMO, selectedTier, setSelectedTier,
  availableTiers, catalog, loading, search, setSearch,
  editingId, setEditingId, editPrice, setEditPrice, updating, onSave
}) {
  return (
    <PricingTab
      hmos={hmos}
      selectedHMO={selectedHMO}
      setSelectedHMO={setSelectedHMO}
      selectedTier={selectedTier}
      setSelectedTier={setSelectedTier}
      availableTiers={availableTiers}
      catalog={catalog}
      loading={loading}
      search={search}
      setSearch={setSearch}
      editingId={editingId}
      setEditingId={setEditingId}
      editPrice={editPrice}
      setEditPrice={setEditPrice}
      updating={updating}
      onSave={onSave}
      title="Services Pricing"
      description="Set HMO-specific pricing for your appointment services"
      searchPlaceholder="Search services..."
      idField="service_id"
      nameField="service_name"
      codeField="service_code"
      extraFields={["duration"]}
    />
  );
}

// Generic Pricing Tab Component
function PricingTab({
  hmos, selectedHMO, setSelectedHMO, selectedTier, setSelectedTier,
  availableTiers, catalog, loading, search, setSearch,
  editingId, setEditingId, editPrice, setEditPrice, updating, onSave,
  title, description, searchPlaceholder, idField, nameField, codeField, extraFields = []
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      {/* HMO and Tier Selection */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-700">Select HMO</label>
          <select
            value={selectedHMO}
            onChange={(e) => {
              setSelectedHMO(e.target.value);
              setSelectedTier("");
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Choose HMO...</option>
            {hmos.map((h) => (
              <option key={h.id} value={h.id}>
                {h.system_hmo?.name || `HMO ${h.id}`}
              </option>
            ))}
          </select>
        </div>

        {selectedHMO && availableTiers.length > 0 && (
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">Select Tier</label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Tiers (HMO Default)</option>
              {availableTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name} Tier
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedHMO ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
          <Info className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-3 text-sm text-slate-600">Select an HMO above to view and manage pricing</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading catalog...
        </div>
      ) : catalog.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-600">
          No items found in catalog
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Catalog Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-700">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  {extraFields.map(field => (
                    <th key={field} className="px-3 py-2 capitalize">{field}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Catalog Price</th>
                  <th className="px-3 py-2 text-right">HMO Price</th>
                  <th className="px-3 py-2 text-center">Discount</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {catalog.map((item) => {
                  const itemId = item[idField];
                  const catalogPrice = Number(item.catalog_price || 0);
                  const hmoPrice = Number(item.hmo_price || catalogPrice);
                  const discount = catalogPrice > 0
                    ? Math.round(((catalogPrice - hmoPrice) / catalogPrice) * 100)
                    : 0;

                  return (
                    <tr key={itemId} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">
                          {item[nameField] || item[codeField]}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {item[codeField]}
                        </div>
                      </td>
                      {extraFields.map(field => (
                        <td key={field} className="px-3 py-2 text-slate-700">
                          {item[field] || "—"}
                        </td>
                      ))}
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
                                if (e.key === "Enter") onSave(itemId);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="w-24 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              autoFocus
                              disabled={updating}
                            />
                            <button
                              onClick={() => onSave(itemId)}
                              disabled={updating}
                              className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            >
                              {updating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={updating}
                              className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
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
                              onClick={() => {
                                setEditingId(itemId);
                                setEditPrice(item.hmo_price || "");
                              }}
                              className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-400 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {discount !== 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              discount > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {discount > 0 && <TrendingDown className="h-3 w-3" />}
                            {discount > 0 ? "-" : "+"}
                            {Math.abs(discount)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => {
                            setEditingId(itemId);
                            setEditPrice(item.hmo_price || "");
                          }}
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
    </div>
  );
}