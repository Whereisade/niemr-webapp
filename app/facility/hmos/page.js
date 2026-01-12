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

export default function EnhancedHMOPage() {
  const [me, setMe] = useState(null);
  const [activeTab, setActiveTab] = useState("hmos"); // hmos | pharmacy | labs | appointments

  // HMO management state
  const [hmos, setHmos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Pharmacy pricing state
  const [selectedPharmacyHMO, setSelectedPharmacyHMO] = useState("");
  const [pharmacyCatalog, setPharmacyCatalog] = useState([]);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacySearch, setPharmacySearch] = useState("");
  const [editingDrugId, setEditingDrugId] = useState(null);
  const [editDrugPrice, setEditDrugPrice] = useState("");
  const [updatingDrug, setUpdatingDrug] = useState(false);

  // Lab pricing state
  const [selectedLabHMO, setSelectedLabHMO] = useState("");
  const [labCatalog, setLabCatalog] = useState([]);
  const [labLoading, setLabLoading] = useState(false);
  const [labSearch, setLabSearch] = useState("");
  const [editingTestId, setEditingTestId] = useState(null);
  const [editTestPrice, setEditTestPrice] = useState("");
  const [updatingTest, setUpdatingTest] = useState(false);

  // Appointment pricing state (new)
  const [selectedApptHMO, setSelectedApptHMO] = useState("");
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

  const isSuperAdmin = useMemo(() => (me?.role || "").toUpperCase() === "SUPER_ADMIN", [me]);
  const activeHMOs = useMemo(() => hmos.filter((h) => h.is_active), [hmos]);

  // Load current user and HMOs
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const meRes = await apiFetch("/accounts/me/");
        setMe(meRes);

        const res = await apiFetch("/facilities/hmos/");
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
        const res = await apiFetch(`/pharmacy/catalog/hmo-catalog/?hmo_id=${selectedPharmacyHMO}`);
        setPharmacyCatalog(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load pharmacy catalog");
      } finally {
        setPharmacyLoading(false);
      }
    }
    loadPharmacy();
  }, [selectedPharmacyHMO, activeTab]);

  // Load lab catalog when HMO selected
  useEffect(() => {
    if (!selectedLabHMO || activeTab !== "labs") return;

    async function loadLab() {
      setLabLoading(true);
      try {
        const res = await apiFetch(`/labs/catalog/hmo-catalog/?hmo_id=${selectedLabHMO}`);
        setLabCatalog(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load lab catalog");
      } finally {
        setLabLoading(false);
      }
    }
    loadLab();
  }, [selectedLabHMO, activeTab]);

  // Load appointments catalog when HMO selected and tab active
  useEffect(() => {
    if (!selectedApptHMO || activeTab !== "appointments") return;

    async function loadAppt() {
      setApptLoading(true);
      try {
        const res = await apiFetch(`/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}`);
        setApptCatalog(normalizeList(res));
      } catch (e) {
        setError(e?.message || "Failed to load appointment catalog");
      } finally {
        setApptLoading(false);
      }
    }
    loadAppt();
  }, [selectedApptHMO, activeTab]);

  async function toggleActive(hmo) {
    if (!hmo?.id) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/facilities/hmos/${hmo.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !hmo.is_active }),
      });
      const res = await apiFetch("/facilities/hmos/");
      setHmos(normalizeList(res));
    } catch (e) {
      setError(e?.message || "Failed to update HMO");
    } finally {
      setBusy(false);
    }
  }

  async function deleteHmo(hmo) {
    if (!hmo?.id) return;
    const ok = window.confirm(`Delete HMO "${hmo.name}"? This will remove all HMO pricing overrides.`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/facilities/hmos/${hmo.id}/`, { method: "DELETE" });
      const res = await apiFetch("/facilities/hmos/");
      setHmos(normalizeList(res));
    } catch (e) {
      setError(e?.message || "Failed to delete HMO");
    } finally {
      setBusy(false);
    }
  }

  async function handleModalSuccess() {
    setShowAddModal(false);
    const res = await apiFetch("/facilities/hmos/");
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
          drug_id: drugId,
          amount: priceValue,
        }),
      });

      // Reload catalog
      const res = await apiFetch(`/pharmacy/catalog/hmo-catalog/?hmo_id=${selectedPharmacyHMO}`);
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
          test_id: testId,
          amount: priceValue,
        }),
      });

      // Reload catalog
      const res = await apiFetch(`/labs/catalog/hmo-catalog/?hmo_id=${selectedLabHMO}`);
      setLabCatalog(normalizeList(res));
      
      setEditingTestId(null);
      setEditTestPrice("");
    } catch (e) {
      setError(e?.message || "Failed to update test price");
    } finally {
      setUpdatingTest(false);
    }
  }

  // Appointment pricing functions (new)
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
          service_id: serviceId,
          amount: priceValue,
        }),
      });

      // Reload catalog
      const res = await apiFetch(`/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}`);
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
        ? `/pharmacy/catalog/import-hmo-file/?hmo_id=${hmoId}`
        : `/labs/catalog/import-hmo-file/?hmo_id=${hmoId}`;

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
        const catalog = await apiFetch(`/pharmacy/catalog/hmo-catalog/?hmo_id=${hmoId}`);
        setPharmacyCatalog(normalizeList(catalog));
      } else {
        const catalog = await apiFetch(`/labs/catalog/hmo-catalog/?hmo_id=${hmoId}`);
        setLabCatalog(normalizeList(catalog));
      }
      
      setImportFile(null);
    } catch (err) {
      setImportError(err?.message || "Failed to import file");
    } finally {
      setImporting(false);
    }
  }

  // Appointment import (new) - uses proxy like others
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

      const endpoint = `/appointments/import-hmo-file/?hmo_id=${selectedApptHMO}`;
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
      const catalog = await apiFetch(`/appointments/hmo-catalog/?hmo_id=${selectedApptHMO}`);
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
            Manage health insurance plans and configure HMO-specific pricing for pharmacy and lab services.
          </p>
        </div>

        <button
          onClick={async () => {
            const res = await apiFetch("/facilities/hmos/");
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
      <div className="mb-6 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
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
          deleteHmo={deleteHmo}
          onAddClick={() => setShowAddModal(true)}
        />
      )}

      {activeTab === "pharmacy" && (
        <PharmacyPricingTab
          activeHMOs={activeHMOs}
          selectedHMO={selectedPharmacyHMO}
          setSelectedHMO={setSelectedPharmacyHMO}
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
        busy={busy}
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

function HMOsTab({ hmos, loading, isSuperAdmin, busy, toggleActive, deleteHmo, onAddClick }) {
  // Calculate stats
  const activeCount = hmos.filter(h => h.is_active).length;
  const inactiveCount = hmos.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5 transition hover:shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-100">
              <Shield className="h-6 w-6 text-blue-700" />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-900">{hmos.length}</div>
          <div className="text-sm font-medium text-blue-700">Total HMOs</div>
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
            <h3 className="text-sm font-semibold text-blue-900">HMO Workflow</h3>
            <div className="mt-2 space-y-1 text-xs text-blue-800">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">1</div>
                <div>Create an HMO plan (e.g., NHIS, Hygeia, AXA Mansard)</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">2</div>
                <div>Set HMO-specific prices in Pharmacy, Lab, and Appointments tabs</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">3</div>
                <div>Attach patients to HMO plans via Patient Details → Insurance tab</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">4</div>
                <div>Billing automatically applies HMO prices for attached patients</div>
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
              <h2 className="text-sm font-bold text-slate-900">Facility HMOs</h2>
              <p className="text-xs text-slate-600">
                {isSuperAdmin ? "Create, disable, or delete HMO plans" : "View HMO plans (Admin access required for editing)"}
              </p>
            </div>

            {isSuperAdmin && (
              <button
                onClick={onAddClick}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-60 disabled:shadow-none"
              >
                <Plus className="h-4 w-4" />
                Add HMO
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-sm text-slate-500">Loading HMOs...</p>
                    </div>
                  </td>
                </tr>
              ) : hmos.length ? (
                hmos.map((h) => (
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
                          <div className="font-semibold text-slate-900">{h.name}</div>
                          <div className="text-xs text-slate-500">ID: {h.id}</div>
                        </div>
                      </div>
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
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {h.created_at ? new Date(h.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      }) : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <a
                          href={`/facility/hmos/${h.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
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
                          onClick={() => deleteHmo(h)}
                          disabled={!isSuperAdmin || busy}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                        <Shield className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-sm font-semibold text-slate-900">No HMOs yet</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {isSuperAdmin ? "Create your first HMO plan to get started" : "Contact your admin to add HMO plans"}
                        </p>
                      </div>
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
          optionalColumns={["name", "unit", "ref_low", "ref_high"]}
        />

        <InfoPanel
          title="File Format - Lab"
          items={[
            { label: "code", desc: "Test code (required)" },
            { label: "price", desc: "HMO price (required)" },
            { label: "name", desc: "Test name (optional)" },
            { label: "unit", desc: "e.g., g/dL (optional)" },
            { label: "ref_low", desc: "Reference low (optional)" },
            { label: "ref_high", desc: "Reference high (optional)" },
          ]}
        />
      </div>

      {/* Right column: Catalog */}
      <CatalogSection
        type="lab"
        selectedHMO={selectedHMO}
        setSelectedHMO={setSelectedHMO}
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

// Appointment Pricing Tab (new)
function AppointmentPricingTab({
  activeHMOs,
  selectedHMO,
  setSelectedHMO,
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
  return (
    <div className="space-y-6">
      {/* HMO Selection */}
      <div className="bg-white rounded-lg border p-6">
        <label className="block text-sm font-medium mb-2">Select HMO</label>
        <select
          value={selectedHMO || ""}
          onChange={(e) => setSelectedHMO(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose an HMO...</option>
          {activeHMOs.map((hmo) => (
            <option key={hmo.id} value={hmo.id}>
              {hmo.name}
            </option>
          ))}
        </select>
      </div>

      {selectedHMO && (
        <>
          {/* Info Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">HMO Pricing Information</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Selected HMO:</strong> {activeHMOs.find(h => String(h.id) === String(selectedHMO))?.name}</p>
              <p><strong>Total Services:</strong> {catalog.length}</p>
              <p className="text-xs mt-2">
                Set custom prices for this HMO. If no HMO price is set, the catalog price will be used.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Import Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Bulk Import HMO Prices
                </h3>

                <form onSubmit={handleImport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Upload CSV or Excel file
                    </label>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files[0])}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Required columns: <code className="bg-gray-100 px-1 rounded">code</code>, <code className="bg-gray-100 px-1 rounded">price</code>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!importFile || importing}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import Prices
                      </>
                    )}
                  </button>
                </form>

                {importResult && (
                  <div className={`mt-4 p-4 rounded-lg ${importResult.errors && importResult.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                    {importResult.created !== undefined && (
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Created: {importResult.created}, Updated: {importResult.updated}
                        </span>
                      </div>
                    )}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-yellow-700 mb-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Errors:</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          {importResult.errors.map((error, idx) => (
                            <p key={idx} className="text-xs text-yellow-700">{error}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Catalog Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Service Catalog</h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {catalogLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                  </div>
                ) : catalog.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No services found. Select an HMO to view pricing.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Service Name</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Catalog Price</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">HMO Price</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Discount</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {catalog.map((item) => (
                          <tr key={item.service_id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">{item.service_name}</td>
                            <td className="py-3 px-4 text-right">₦{parseFloat(item.catalog_price || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right">
                              {editingId === item.service_id ? (
                                <input
                                  type="number"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-24 px-2 py-1 border rounded text-right"
                                  step="0.01"
                                  min="0"
                                />
                              ) : (
                                `₦${parseFloat(item.hmo_price || item.catalog_price || 0).toLocaleString()}`
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                (item.discount_percent || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {item.discount_percent || 0}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {editingId === item.service_id ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => savePrice(item.service_id)}
                                    disabled={updating}
                                    className="text-green-600 hover:text-green-700 disabled:text-gray-400"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    disabled={updating}
                                    className="text-red-600 hover:text-red-700 disabled:text-gray-400"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(item)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Shared Components
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
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50">
          <Upload className="h-4 w-4 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleImport} className="space-y-3 text-xs">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-600">
            Select File
          </label>
          <div className="flex items-center gap-2">
            <label className="relative flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs transition hover:border-emerald-500 hover:bg-emerald-50">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setImportError("");
                }}
                className="sr-only"
                disabled={disabled}
              />
              {importFile ? (
                <div className="flex items-center gap-2">
                  {fileExtension === 'csv' ? (
                    <FileText className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  )}
                  <span className="truncate text-slate-700">{importFile.name}</span>
                </div>
              ) : (
                <span className="text-slate-500">Choose file…</span>
              )}
            </label>
            {importFile && (
              <button
                type="button"
                onClick={() => setImportFile(null)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
          {disabled && (
            <p className="mt-1 text-[11px] text-amber-600">
              Please select an HMO first
            </p>
          )}
          {importFile && !isValidFile && (
            <p className="mt-1 text-[11px] text-amber-600">
              Warning: Use .csv, .xlsx, or .xls files
            </p>
          )}
        </div>

        {importError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-[11px] text-rose-800">{importError}</p>
          </div>
        )}

        {importResult && (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-emerald-900">
                  {importResult.message || 'Import successful'}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700">
                  Created: {importResult.created}, Updated: {importResult.updated}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            disabled={importing || !importFile || disabled}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {importing ? "Importing…" : "Import File"}
          </button>
        </div>
      </form>
    </section>
  );
}

function InfoPanel({ title, items }) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100">
          <Info className="h-4 w-4 text-blue-700" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900">{title}</h3>
          <div className="mt-2 space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="text-xs text-blue-800">
                <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">
                  {item.label}
                </code>
                <span className="ml-1">- {item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CatalogSection({
  type,
  selectedHMO,
  setSelectedHMO,
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
            onChange={(e) => setSelectedHMO(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select HMO…</option>
            {activeHMOs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
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
        <div className="overflow-x-auto rounded-xl border border-slate-200">
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
      )}
    </section>
  );
}
