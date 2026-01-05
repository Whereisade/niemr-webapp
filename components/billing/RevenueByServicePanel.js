"use client";

import { useMemo, useEffect, useState } from "react";
import { useRevenueByService } from "@/lib/useRevenueByService";
import { apiFetch } from "@/lib/api";
import { TrendingUp, TrendingDown, Activity, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function categoryLabel(cat) {
  const c = String(cat || "").toUpperCase();
  if (c === "LABS") return "Laboratory";
  if (c === "PHARMACY") return "Pharmacy";
  if (c === "OTHER") return "Other Services";
  return c || "—";
}

function categoryIcon(cat) {
  const c = String(cat || "").toUpperCase();
  if (c === "LABS") return "🔬";
  if (c === "PHARMACY") return "💊";
  if (c === "OTHER") return "🏥";
  return "📊";
}

function CategoryCard({ category, isHighlighted = false }) {
  const collectionRate = category.billed_total > 0 
    ? (category.collected_total / category.billed_total) * 100 
    : 0;

  const isHealthy = collectionRate >= 80;

  return (
    <div className={`group overflow-hidden rounded-2xl border transition-all ${
      isHighlighted 
        ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-lg shadow-emerald-500/10" 
        : "border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-md"
    }`}>
      <div className="border-b border-slate-100 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryIcon(category.category)}</span>
            <div>
              <div className="text-sm font-bold text-slate-900">{categoryLabel(category.category)}</div>
              <div className="text-xs text-slate-500">{category.count || 0} transactions</div>
            </div>
          </div>
          <div className={`rounded-full p-2 ${isHealthy ? "bg-emerald-100" : "bg-amber-100"}`}>
            {isHealthy ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-amber-600" />
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Billed</div>
            <div className="text-base font-bold text-slate-900">{formatMoney(category.billed_total || 0)}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Collected</div>
            <div className="text-base font-bold text-emerald-700">{formatMoney(category.collected_total || 0)}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Outstanding</div>
            <div className="text-base font-bold text-amber-700">{formatMoney(category.outstanding_total || 0)}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">Collection Rate</span>
            <span className={`font-bold ${isHealthy ? "text-emerald-700" : "text-amber-700"}`}>
              {collectionRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 ${
                isHealthy ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-amber-500 to-orange-500"
              }`}
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceRow({ service, index }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const collectionRate = service.billed_total > 0 
    ? (service.collected_total / service.billed_total) * 100 
    : 0;

  return (
    <>
      <tr 
        onClick={() => setIsExpanded(!isExpanded)}
        className="group cursor-pointer transition hover:bg-slate-50"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 group-hover:bg-slate-200">
              {index + 1}
            </div>
            <div>
              <div className="font-medium text-slate-900">
                {service.service_name || service.service_code}
              </div>
              <div className="text-xs text-slate-500">{service.service_code}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
            <span>{categoryIcon(service.category)}</span>
            <span>{categoryLabel(service.category)}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="font-semibold text-slate-900">{formatMoney(service.billed_total)}</div>
          <div className="text-xs text-slate-500">{service.count} charges</div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="font-semibold text-emerald-700">{formatMoney(service.collected_total)}</div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="font-semibold text-amber-700">{formatMoney(service.outstanding_total)}</div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <div className="w-24">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${Math.min(collectionRate, 100)}%` }}
                />
              </div>
            </div>
            <div className="w-12 text-right text-xs font-semibold text-slate-700">
              {collectionRate.toFixed(0)}%
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-slate-50/50 px-4 py-3">
            <div className="grid grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <div className="mb-1 text-xs font-medium text-slate-600">Total Charges</div>
                <div className="text-lg font-bold text-slate-900">{service.count}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-slate-600">Billed Amount</div>
                <div className="text-lg font-bold text-slate-900">{formatMoney(service.billed_total)}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-slate-600">Collected Amount</div>
                <div className="text-lg font-bold text-emerald-700">{formatMoney(service.collected_total)}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-slate-600">Outstanding</div>
                <div className="text-lg font-bold text-amber-700">{formatMoney(service.outstanding_total)}</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function RevenueByServicePanel({ params = {}, title = "Revenue Breakdown" }) {
  const stableParams = useMemo(() => params || {}, [JSON.stringify(params || {})]);
  const { data, error, isLoading } = useRevenueByService(stableParams);
  const [userRole, setUserRole] = useState(null);
  const [showAllServices, setShowAllServices] = useState(false);

  useEffect(() => {
    async function loadMe() {
      try {
        const me = await apiFetch("/accounts/me/");
        setUserRole(me?.role?.toUpperCase() || null);
      } catch {
        // ignore
      }
    }
    loadMe();
  }, []);

  const allCategories = Array.isArray(data?.categories) ? data.categories : [];
  const categories = useMemo(() => {
    if (!userRole) return allCategories;

    if (userRole === "LAB") {
      return allCategories.filter((c) => c.category === "LABS");
    }

    if (userRole === "PHARMACY") {
      return allCategories.filter((c) => c.category === "PHARMACY");
    }

    return allCategories;
  }, [allCategories, userRole]);

  const allServices = Array.isArray(data?.services) ? data.services : [];
  const services = useMemo(() => {
    if (!userRole) return allServices;

    if (userRole === "LAB") {
      return allServices.filter((s) => s.category === "LABS");
    }

    if (userRole === "PHARMACY") {
      return allServices.filter((s) => s.category === "PHARMACY");
    }

    return allServices;
  }, [allServices, userRole]);

  const displayedServices = showAllServices ? services : services.slice(0, 8);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-600">
                Revenue analysis by category and service
              </p>
            </div>
          </div>
          <Activity className="h-5 w-5 text-slate-400" />
        </div>
      </div>

      {isLoading && !data ? (
        <div className="p-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />
          <p className="text-sm text-slate-500">Loading revenue breakdown…</p>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
            Failed to load breakdown: {error.message || "Unknown error"}
          </div>
        </div>
      ) : (
        <>
          {/* Category Cards */}
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
              {categories.map((c) => (
                <CategoryCard key={c.category} category={c} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
                <BarChart3 className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No revenue data</h3>
              <p className="text-sm text-slate-500">
                No revenue data available for your category.
              </p>
            </div>
          )}

          {/* Services Table */}
          {services.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="bg-slate-50/50 px-6 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Top Services by Revenue</h3>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/30 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Billed</th>
                      <th className="px-4 py-3 text-right">Collected</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                      <th className="px-4 py-3 text-right">Collection Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedServices.map((s, idx) => (
                      <ServiceRow key={s.service_code} service={s} index={idx} />
                    ))}
                  </tbody>
                </table>
              </div>

              {services.length > 8 && (
                <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-3">
                  <button
                    onClick={() => setShowAllServices(!showAllServices)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
                  >
                    {showAllServices ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show {services.length - 8} more services
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}