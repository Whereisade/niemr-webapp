// components/provider/ServicesPricingTab.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  Search,
  Loader2,
  Edit2,
  Check,
  X,
  DollarSign,
  TrendingDown,
  Upload,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ServicesPricingTab({ hmoId, systemHMO }) {
  const [selectedTier, setSelectedTier] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [updating, setUpdating] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const tiers = systemHMO?.tiers || [];
  const systemHMOId = systemHMO?.id;

  // Load catalog when tier changes
  useEffect(() => {
    if (!systemHMOId) return;
    
    async function loadCatalog() {
      setLoading(true);
      try {
        const url = selectedTier
          ? `/appointments/hmo-catalog/?hmo_id=${systemHMOId}&tier_id=${selectedTier}`
          : `/appointments/hmo-catalog/?hmo_id=${systemHMOId}`;
        
        const data = await apiFetch(url);
        setCatalog(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setCatalog([]);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, [systemHMOId, selectedTier]);

  // Filter catalog by search
  const filteredCatalog = useMemo(() => {
    if (!search) return catalog;
    const s = search.toLowerCase();
    return catalog.filter(
      (item) =>
        item.service_name?.toLowerCase().includes(s) ||
        item.service_code?.toLowerCase().includes(s)
    );
  }, [catalog, search]);

  // Start editing
  function startEdit(item) {
    setEditingId(item.service_id);
    setEditPrice(item.hmo_price || "");
  }

  // Cancel editing
  function cancelEdit() {
    setEditingId(null);
    setEditPrice("");
  }

  // Save price
  async function savePrice(serviceId) {
    if (!editPrice || updating) return;
    
    setUpdating(true);
    try {
      await apiFetch("/appointments/set-hmo-price/", {
        method: "POST",
        body: JSON.stringify({
          hmo_id: systemHMOId,
          tier_id: selectedTier || null,
          service_id: serviceId,
          amount: editPrice,
        }),
      });

      // Reload catalog
      const url = selectedTier
        ? `/appointments/hmo-catalog/?hmo_id=${systemHMOId}&tier_id=${selectedTier}`
        : `/appointments/hmo-catalog/?hmo_id=${systemHMOId}`;
      
      const data = await apiFetch(url);
      setCatalog(Array.isArray(data) ? data : []);
      
      cancelEdit();
    } catch (err) {
      console.error(err);
      alert("Failed to save price");
    } finally {
      setUpdating(false);
    }
  }

  // Handle file import
  async function handleImport() {
    if (!importFile || importing) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const tierParam = selectedTier ? `&tier_id=${selectedTier}` : "";
      const res = await fetch(
        `/api/appointments/import-hmo-file/?hmo_id=${systemHMOId}${tierParam}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      setImportResult(data);

      // Reload catalog
      const url = selectedTier
        ? `/appointments/hmo-catalog/?hmo_id=${systemHMOId}&tier_id=${selectedTier}`
        : `/appointments/hmo-catalog/?hmo_id=${systemHMOId}`;
      
      const catalogData = await apiFetch(url);
      setCatalog(Array.isArray(catalogData) ? catalogData : []);
    } catch (err) {
      console.error(err);
      setImportResult({ errors: ["Import failed"] });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Services Pricing</h2>
        <p className="text-sm text-slate-600">
          Set HMO-specific pricing for your appointment services
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Left: Import Section */}
        <div className="space-y-4">
          <ImportSection
            importFile={importFile}
            setImportFile={setImportFile}
            importing={importing}
            importResult={importResult}
            handleImport={handleImport}
          />
          <InfoPanel />
        </div>

        {/* Right: Catalog */}
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Tier Selection */}
            {tiers.length > 0 && (
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">All Tiers (HMO Default)</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} Tier
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Catalog Table */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading services…
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-600">
              No services found
            </div>
          ) : (
            <CatalogTable
              catalog={filteredCatalog}
              editingId={editingId}
              editPrice={editPrice}
              setEditPrice={setEditPrice}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              savePrice={savePrice}
              updating={updating}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Catalog Table Component
function CatalogTable({
  catalog,
  editingId,
  editPrice,
  setEditPrice,
  startEdit,
  cancelEdit,
  savePrice,
  updating,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
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
            const catalogPrice = Number(item.catalog_price || 0);
            const hmoPrice = Number(item.hmo_price || catalogPrice);
            const discount =
              catalogPrice > 0
                ? Math.round(((catalogPrice - hmoPrice) / catalogPrice) * 100)
                : 0;

            return (
              <tr key={item.service_id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">
                    {item.service_name || item.service_code}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {item.service_code}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-700">
                  {item.duration || "—"}
                </td>
                <td className="px-3 py-2 text-right font-medium text-slate-900">
                  ₦{catalogPrice.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {editingId === item.service_id ? (
                    <EditPriceInput
                      value={editPrice}
                      onChange={setEditPrice}
                      onSave={() => savePrice(item.service_id)}
                      onCancel={cancelEdit}
                      updating={updating}
                    />
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
  );
}

// Edit Price Input Component
function EditPriceInput({ value, onChange, onSave, onCancel, updating }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
        className="w-24 rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        autoFocus
        disabled={updating}
      />
      <button
        type="button"
        onClick={onSave}
        disabled={updating}
        className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
        title="Save"
      >
        {updating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={updating}
        className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        title="Cancel"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// Import Section Component
function ImportSection({
  importFile,
  setImportFile,
  importing,
  importResult,
  handleImport,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 font-semibold text-slate-900">Import Prices</h3>
      <p className="mb-4 text-xs text-slate-600">
        Upload CSV/Excel with service codes and prices
      </p>

      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
        className="mb-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
      />

      <button
        onClick={handleImport}
        disabled={!importFile || importing}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {importing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Import
          </>
        )}
      </button>

      {importResult && (
        <div
          className={`mt-3 rounded-lg border p-3 text-xs ${
            importResult.errors?.length
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {importResult.created && (
            <p>✓ Created: {importResult.created}</p>
          )}
          {importResult.updated && (
            <p>✓ Updated: {importResult.updated}</p>
          )}
          {importResult.errors?.map((err, idx) => (
            <p key={idx}>✗ {err}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// Info Panel Component
function InfoPanel() {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-700" />
        <h3 className="font-semibold text-blue-900">File Format</h3>
      </div>
      <ul className="space-y-1 text-xs text-blue-800">
        <li>
          <code className="rounded bg-blue-100 px-1 py-0.5">code</code> - Service
          code (required)
        </li>
        <li>
          <code className="rounded bg-blue-100 px-1 py-0.5">price</code> - HMO
          price (required)
        </li>
        <li>
          <code className="rounded bg-blue-100 px-1 py-0.5">name</code> - Service
          name (optional)
        </li>
      </ul>
    </div>
  );
}