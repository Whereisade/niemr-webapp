"use client";

import { useMemo, useEffect, useState } from "react";
import { useRevenueByService } from "@/lib/useRevenueByService";
import { apiFetch } from "@/lib/api";

function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function categoryLabel(cat) {
  const c = String(cat || "").toUpperCase();
  if (c === "LABS") return "Labs";
  if (c === "PHARMACY") return "Pharmacy";
  if (c === "OTHER") return "Other";
  return c || "—";
}

export default function RevenueByServicePanel({ params = {}, title = "Revenue breakdown" }) {
  const stableParams = useMemo(() => params || {}, [JSON.stringify(params || {})]);

  const { data, error, isLoading } = useRevenueByService(stableParams);
  const [userRole, setUserRole] = useState(null);

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

  // Filter categories based on user role
  const allCategories = Array.isArray(data?.categories) ? data.categories : [];
  const categories = useMemo(() => {
    if (!userRole) return allCategories;

    // LAB users should only see LABS category
    if (userRole === "LAB") {
      return allCategories.filter((c) => c.category === "LABS");
    }

    // PHARMACY users should only see PHARMACY category
    if (userRole === "PHARMACY") {
      return allCategories.filter((c) => c.category === "PHARMACY");
    }

    // DOCTOR and NURSE can see all categories
    return allCategories;
  }, [allCategories, userRole]);

  // Filter services based on user role
  const allServices = Array.isArray(data?.services) ? data.services : [];
  const services = useMemo(() => {
    if (!userRole) return allServices;

    // LAB users should only see LAB services
    if (userRole === "LAB") {
      return allServices.filter((s) => s.category === "LABS");
    }

    // PHARMACY users should only see PHARMACY services
    if (userRole === "PHARMACY") {
      return allServices.filter((s) => s.category === "PHARMACY");
    }

    // DOCTOR and NURSE can see all services
    return allServices;
  }, [allServices, userRole]);

  const topServices = services.slice(0, 8);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Collected vs billed totals grouped by service (labs vs pharmacy).
          </p>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Loading revenue breakdown…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load breakdown: {error.message || "Unknown error"}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(categories.length ? categories : []).map(
              (c) => (
                <div key={c.category} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-medium text-slate-600">{categoryLabel(c.category)}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Billed</div>
                      <div className="font-semibold text-slate-900">{formatMoney(c.billed_total || 0)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Collected</div>
                      <div className="font-semibold text-slate-900">{formatMoney(c.collected_total || 0)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Outstanding</div>
                      <div className="font-semibold text-slate-900">{formatMoney(c.outstanding_total || 0)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Count</div>
                      <div className="font-semibold text-slate-900">{Number(c.count || 0)}</div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {categories.length === 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No revenue data available for your category.
            </div>
          )}

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Top services</h3>
              <span className="text-xs text-slate-500">By billed total</span>
            </div>

            {topServices.length ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold text-slate-700">
                      <th className="px-3 py-2">Service</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Billed</th>
                      <th className="px-3 py-2 text-right">Collected</th>
                      <th className="px-3 py-2 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {topServices.map((s) => (
                      <tr key={s.service_code} className="text-xs text-slate-700">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">{s.service_name || s.service_code}</div>
                          <div className="text-[11px] text-slate-500">{s.service_code}</div>
                        </td>
                        <td className="px-3 py-2">{categoryLabel(s.category)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(s.billed_total)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(s.collected_total)}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(s.outstanding_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No data yet.
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}