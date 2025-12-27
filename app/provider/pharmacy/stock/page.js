"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Pill,
  Boxes,
  History,
  Search,
  Loader2,
  ArrowLeft,
  PlusCircle,
  Edit3,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
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

export default function ProviderPharmacyStockPage() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [stock, setStock] = useState([]);
  const [txns, setTxns] = useState([]);
  const [catalog, setCatalog] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // Adjust stock form
  const [adjustStockId, setAdjustStockId] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Update price form
  const [priceDrugId, setPriceDrugId] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const [flashError, setFlashError] = useState("");
  const [flashSuccess, setFlashSuccess] = useState("");

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const [meRes, stockRes, txnsRes, catalogRes] = await Promise.all([
        apiFetch("/accounts/me/", { method: "GET" }),
        apiFetch("/pharmacy/stock/?page=1&limit=500", { method: "GET" }),
        apiFetch("/pharmacy/stock/txns/?page=1&limit=200", { method: "GET" }),
        apiFetch("/pharmacy/catalog/?page=1&limit=1000", { method: "GET" }),
      ]);

      setMe(meRes);
      setStock(normaliseList(stockRes));
      setTxns(normaliseList(txnsRes));
      setCatalog(normaliseList(catalogRes));
    } catch (e) {
      setError(e?.message || "Failed to load stock.");
    } finally {
      setLoadingMe(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meRole = String(me?.role || "").toUpperCase();
  const canManage = ["PHARMACY", "ADMIN", "SUPER_ADMIN"].includes(meRole);

  const stockRows = useMemo(() => {
    const rows = normaliseList({ results: stock })
      .map((s) => {
        const drug = s.drug || {};
        const qty = Number(s.qty_on_hand ?? s.current_qty ?? 0) || 0;
        const unitPrice = Number(drug.unit_price ?? 0) || 0;
        return {
          id: s.id,
          drugId: drug.id,
          code: drug.code || "",
          name: drug.name || "",
          strength: drug.strength || "",
          form: drug.form || "",
          qty,
          unitPrice,
          updatedAt: s.updated_at || s.last_updated || s.modified_at || null,
        };
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((r) => {
      return (
        (r.code || "").toLowerCase().includes(term) ||
        (r.name || "").toLowerCase().includes(term) ||
        (r.strength || "").toLowerCase().includes(term) ||
        (r.form || "").toLowerCase().includes(term)
      );
    });
  }, [stock, search]);

  const stats = useMemo(() => {
    let totalLines = stockRows.length;
    let totalQty = 0;
    let totalValue = 0;
    for (const r of stockRows) {
      totalQty += r.qty;
      totalValue += r.qty * (r.unitPrice || 0);
    }
    return { totalLines, totalQty, totalValue };
  }, [stockRows]);

  const catalogOptions = useMemo(() => {
    return catalog
      .filter((d) => d && d.is_active !== false)
      .map((d) => {
        const label = `${d.name || d.code || "Drug"}${d.strength ? ` ${d.strength}` : ""}${d.form ? ` • ${d.form}` : ""}`;
        return { id: d.id, code: d.code, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [catalog]);

  async function handleAdjust(e) {
    e.preventDefault();
    setFlashError("");
    setFlashSuccess("");
    const sid = Number(adjustStockId);
    const delta = Number(adjustDelta);
    if (!Number.isFinite(sid) || sid <= 0) {
      setFlashError("Select a stock item.");
      return;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      setFlashError("Enter a non-zero quantity change.");
      return;
    }

    try {
      setAdjusting(true);
      await apiFetch("/pharmacy/stock/adjust/", {
        method: "POST",
        body: JSON.stringify({ stock: sid, delta, reason: adjustReason || "" }),
      });
      setFlashSuccess("Stock updated.");
      setAdjustStockId("");
      setAdjustDelta("");
      setAdjustReason("");
      await loadAll();
    } catch (e2) {
      setFlashError(e2?.message || "Failed to adjust stock.");
    } finally {
      setAdjusting(false);
    }
  }

  async function handleUpdatePrice(e) {
    e.preventDefault();
    setFlashError("");
    setFlashSuccess("");
    const did = Number(priceDrugId);
    const unitPrice = Number(priceValue);
    if (!Number.isFinite(did) || did <= 0) {
      setFlashError("Select a drug to update.");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setFlashError("Enter a valid unit price.");
      return;
    }
    try {
      setUpdatingPrice(true);
      await apiFetch(`/pharmacy/catalog/${did}/`, {
        method: "PATCH",
        body: JSON.stringify({ unit_price: unitPrice }),
      });
      setFlashSuccess("Price updated.");
      setPriceDrugId("");
      setPriceValue("");
      await loadAll();
    } catch (e2) {
      setFlashError(e2?.message || "Failed to update price.");
    } finally {
      setUpdatingPrice(false);
    }
  }

  if (loadingMe || loading) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading stock…
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-6 md:p-10">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ArrowLeft className="h-4 w-4" />
          <Link href="/provider/pharmacy" className="text-sky-700 hover:underline">
            Back to pharmacy
          </Link>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            <Pill className="h-3.5 w-3.5" />
            Provider · Pharmacy
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Stock
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor inventory, adjust quantities, and update catalog pricing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/provider/pharmacy"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      {!canManage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Stock management is restricted to PHARMACY/Admin roles.
        </div>
      ) : null}

      {(flashError || flashSuccess) && (
        <div>
          {flashError ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>{flashError}</div>
            </div>
          ) : null}
          {flashSuccess ? (
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <div>{flashSuccess}</div>
            </div>
          ) : null}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Stock lines" value={stats.totalLines} icon={Boxes} />
        <StatCard label="Total qty" value={stats.totalQty} icon={PlusCircle} />
        <StatCard label="Est. value" value={stats.totalValue.toLocaleString()} icon={Edit3} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {/* Adjust stock */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Adjust stock</h2>
          <p className="mt-1 text-sm text-slate-600">Add or remove quantity for a stock item.</p>

          <form onSubmit={handleAdjust} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stock item
              </label>
              <select
                value={adjustStockId}
                onChange={(e) => setAdjustStockId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Select…</option>
                {stockRows.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name || r.code || `Stock #${r.id}`} {r.code ? `(${r.code})` : ""} — qty {r.qty}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Change (delta)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder="e.g. 10 or -5"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Restock"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canManage || adjusting}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update stock
            </button>
          </form>
        </div>

        {/* Update price */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Update price</h2>
          <p className="mt-1 text-sm text-slate-600">Edit catalog unit price used for billing totals.</p>

          <form onSubmit={handleUpdatePrice} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Drug
              </label>
              <select
                value={priceDrugId}
                onChange={(e) => setPriceDrugId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Select…</option>
                {catalogOptions.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.label} {d.code ? `(${d.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Unit price
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder="e.g. 1500"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={!canManage || updatingPrice}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {updatingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save price
            </button>
          </form>
        </div>
      </section>

      {/* Stock table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Boxes className="h-3.5 w-3.5 text-slate-400" />
              Inventory
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drug / code…"
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Drug</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit price</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-left">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockRows.length ? (
                stockRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {r.name || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {[r.strength, r.form].filter(Boolean).join(" • ") || " "}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.code || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{r.qty}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {r.unitPrice ? r.unitPrice.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {(r.qty * (r.unitPrice || 0)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(r.updatedAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-600" colSpan={6}>
                    No stock items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent txns */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700" />
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <History className="h-3.5 w-3.5 text-slate-400" />
            Recent movements
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Drug</th>
                <th className="px-4 py-3 text-right">Delta</th>
                <th className="px-4 py-3 text-left">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txns.length ? (
                txns.slice(0, 50).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(t.created_at || t.timestamp)}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {t.drug_name || t.drug?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {Number(t.delta || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.reason || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-600" colSpan={4}>
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}
