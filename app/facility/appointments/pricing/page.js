"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  CalendarRange,
  DollarSign,
  RefreshCw,
  Edit2,
  Check,
  X,
  Loader2,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

function formatMoney(v) {
  if (v === null || v === undefined) return "0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AppointmentServicePricesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [updating, setUpdating] = useState(false);

  async function loadPrices() {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const data = await apiFetch("/appointments/service_prices/", {
        method: "GET",
      });
      
      console.log("Service prices response:", data);
      
      // Handle response format
      let servicesList = [];
      if (Array.isArray(data)) {
        servicesList = data;
      } else if (data?.services && Array.isArray(data.services)) {
        servicesList = data.services;
      } else if (data?.results && Array.isArray(data.results)) {
        servicesList = data.results;
      } else {
        console.error("Unexpected data format:", data);
        setError("Unexpected response format from server");
        return;
      }
      
      console.log("Processed services list:", servicesList);
      setServices(servicesList);
      
      if (servicesList.length === 0) {
        setError("No appointment services found. Please run: python manage.py seed_appointment_services");
      }
    } catch (err) {
      console.error("Failed to load appointment service prices", err);
      setError(err?.message || "Failed to load service prices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrices();
  }, []);

  function startEdit(service) {
    setEditingId(service.service_id);
    // Use existing price if set, otherwise empty string for new entry
    setEditPrice(service.facility_price || "");
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPrice("");
    setError("");
  }

  async function savePrice(service) {
    const priceValue = editPrice.trim();
    
    // Validation
    if (!priceValue) {
      setError("Please enter a price");
      return;
    }
    
    const numPrice = Number(priceValue);
    if (isNaN(numPrice) || numPrice < 0) {
      setError("Please enter a valid price (0 or greater)");
      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      // Create or update price via the billing prices endpoint
      const payload = {
        service: service.service_id,
        amount: priceValue,
        currency: "NGN",
      };
      
      console.log("Saving price:", payload);
      
      const response = await apiFetch("/billing/prices/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      console.log("Save response:", response);
      
      setSuccess(`Price set for ${service.service_name}: ₦${formatMoney(priceValue)}`);
      
      // Reload prices to show updated values
      await loadPrices();
      
      setEditingId(null);
      setEditPrice("");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (err) {
      console.error("Failed to update service price", err);
      setError(err?.message || "Failed to update service price");
    } finally {
      setUpdating(false);
    }
  }

  // Count how many prices are set vs not set
  const setPrices = services.filter(s => s.is_set).length;
  const totalPrices = services.length;
  const allPricesSet = totalPrices > 0 && setPrices === totalPrices;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Appointment Service Pricing</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Set prices for appointment types. These charges are automatically created when patients check in.
          </p>
        </div>

        <button
          onClick={loadPrices}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={loading || updating}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900">{success}</p>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800">×</button>
        </div>
      )}

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

      {/* Warning banner if not all prices are set */}
      {!allPricesSet && totalPrices > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Price Setup Required</p>
            <p className="mt-1 text-xs text-amber-800">
              {setPrices} of {totalPrices} appointment types have prices set. 
              Auto-billing will only work for appointment types with configured prices.
            </p>
          </div>
        </div>
      )}

      {/* Info panel */}
      <section className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100">
            <Info className="h-4 w-4 text-blue-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900">How Pricing Works</h3>
            <ul className="mt-2 space-y-1 text-xs text-blue-800">
              <li>• <strong>No default prices</strong> - You must set prices for each appointment type</li>
              <li>• When a patient checks in, a billing charge is automatically created based on your configured price</li>
              <li>• If a price is not set, auto-billing will be skipped for that appointment type</li>
              <li>• If patient has HMO insurance, HMO-specific pricing is used (if configured in HMO settings)</li>
              <li>• All charges can be viewed and managed in the Billing section</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Services Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Service Pricing</h2>
              <p className="text-xs text-slate-600">
                {loading ? "Loading…" : `${services.length} appointment service types`}
              </p>
            </div>
            {services.length > 0 && (
              <div className="flex items-center gap-2">
                {allPricesSet ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>All prices set</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{setPrices}/{totalPrices} configured</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-sm text-slate-500">Loading service prices…</p>
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
              <DollarSign className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-slate-900">No services found</h3>
            <p className="text-sm text-slate-500">
              Run the seeding command to create appointment services:
            </p>
            <code className="mt-2 inline-block rounded bg-slate-100 px-3 py-1 text-xs font-mono text-slate-700">
              python manage.py seed_appointment_services
            </code>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3">Service Name</th>
                  <th className="px-4 py-3">Service Code</th>
                  <th className="px-4 py-3 text-right">Your Price</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((service) => {
                  const facilityPrice = service.facility_price ? Number(service.facility_price) : null;
                  const isSet = service.is_set || (facilityPrice !== null);
                  const isEditing = editingId === service.service_id;

                  return (
                    <tr key={service.service_id} className={`group transition hover:bg-slate-50 ${!isSet ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {service.service_name || service.appt_type || "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {service.appt_type || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                          {service.service_code || "N/A"}
                        </code>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="relative inline-block">
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                                <span className="text-xs font-semibold text-slate-500">₦</span>
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") savePrice(service);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                placeholder="Enter price"
                                className="w-32 rounded-lg border border-blue-300 bg-blue-50 py-2 pl-6 pr-3 text-right text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                autoFocus
                                disabled={updating}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => savePrice(service)}
                              disabled={updating}
                              className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                              title="Save price"
                            >
                              {updating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={updating}
                              className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            {isSet ? (
                              <>
                                <div className="font-semibold text-slate-900">
                                  ₦{formatMoney(facilityPrice)}
                                </div>
                                <div className="text-xs text-emerald-600 font-medium">Price set</div>
                              </>
                            ) : (
                              <>
                                <div className="font-semibold text-amber-600">
                                  Not Set
                                </div>
                                <div className="text-xs text-amber-600">Click to set price</div>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isSet ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            Required
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => startEdit(service)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50 ${
                              isSet 
                                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" 
                                : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            }`}
                            disabled={updating}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            {isSet ? "Edit Price" : "Set Price"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}