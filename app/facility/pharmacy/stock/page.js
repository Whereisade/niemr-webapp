"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pill,
  Boxes,
  History,
  TrendingDown,
  TrendingUp,
  Search,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "PHARMACY"];

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
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export default function FacilityPharmacyStockPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [stock, setStock] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockError, setStockError] = useState(null);

  const [txns, setTxns] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [txnsError, setTxnsError] = useState(null);

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");

  const [adjustForm, setAdjustForm] = useState({
    drug_id: "",
    qty: "",
    note: "",
  });
  const [drugSearch, setDrugSearch] = useState("");
  const [drugDropdownOpen, setDrugDropdownOpen] = useState(false);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState(null);
  const [adjustSuccess, setAdjustSuccess] = useState("");

  // --- load current user & guard roles ---
  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const json = await res.json();
        if (!cancelled) setMe(json);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const meRole = (me?.role || "").toUpperCase();
  const canManage = useMemo(
    () => STAFF_ROLES.includes(meRole),
    [meRole]
  );

  // --- load stock, txns, catalog when allowed ---
  useEffect(() => {
    if (!me || !canManage) {
      setLoadingStock(false);
      setLoadingTxns(false);
      setLoadingCatalog(false);
      return;
    }

    let cancelled = false;

    async function loadAll() {
      setLoadingStock(true);
      setLoadingTxns(true);
      setLoadingCatalog(true);
      setStockError(null);
      setTxnsError(null);
      setCatalogError(null);

      try {
        const [stockRes, txnsRes, catalogRes] = await Promise.all([
          fetch("/api/proxy/pharmacy/stock/", { cache: "no-store" }),
          fetch("/api/proxy/pharmacy/stock/txns/", { cache: "no-store" }),
          fetch("/api/proxy/pharmacy/catalog/", { cache: "no-store" }),
        ]);

        if (!cancelled) {
          if (!stockRes.ok) {
            throw new Error(
              `Failed to load stock (${stockRes.status})`
            );
          }
          if (!txnsRes.ok) {
            throw new Error(
              `Failed to load stock history (${txnsRes.status})`
            );
          }
          if (!catalogRes.ok) {
            throw new Error(
              `Failed to load catalog (${catalogRes.status})`
            );
          }

          const [stockJson, txnsJson, catalogJson] = await Promise.all([
            stockRes.json(),
            txnsRes.json(),
            catalogRes.json(),
          ]);

          setStock(normaliseList(stockJson));
          setTxns(normaliseList(txnsJson));
          setCatalog(normaliseList(catalogJson));
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.message || "Failed to load pharmacy stock data.";
          setStockError(msg);
          setTxnsError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoadingStock(false);
          setLoadingTxns(false);
          setLoadingCatalog(false);
        }
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [me, canManage, refreshKey]);

  // Map of current qty by drug ID for quick lookup
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

  // Sorted stock list for display
  const stockRows = useMemo(() => {
    let rows = stock.map((s) => {
      const drug = s.drug || {};
      return {
        id: s.id,
        drugId: drug.id,
        code: drug.code || "",
        name: drug.name || "",
        strength: drug.strength || "",
        form: drug.form || "",
        route: drug.route || "",
        current_qty: s.current_qty ?? 0,
      };
    });
    if (search.trim()) {
      const term = search.toLowerCase();
      rows = rows.filter((r) => {
        return (
          r.code.toLowerCase().includes(term) ||
          r.name.toLowerCase().includes(term) ||
          r.strength.toLowerCase().includes(term)
        );
      });
    }
    // sort by name
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [stock, search]);

  // Some quick stats
  const stockStats = useMemo(() => {
    const totalLines = stockRows.length;
    let totalQty = 0;
    let low = 0;
    for (const r of stockRows) {
      const q = Number(r.current_qty) || 0;
      totalQty += q;
      if (q <= 10) low += 1; // threshold can be adjusted
    }
    return { totalLines, totalQty, low };
  }, [stockRows]);

  // Catalog options for adjust dropdown
  const catalogOptions = useMemo(() => {
    const list = normaliseList({ results: catalog.length ? catalog : [] });
    return list
      .map((d) => {
        const current = stockByDrugId.get(d.id) ?? 0;
        return {
          id: d.id,
          label: `${d.name || "Drug"}${
            d.strength ? ` ${d.strength}` : ""
          }`,
          code: d.code,
          current,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [catalog, stockByDrugId]);

  const filteredCatalogOptions = useMemo(() => {
    const term = drugSearch.trim().toLowerCase();
    if (!term) return catalogOptions;
    return catalogOptions.filter((opt) => {
      const code = (opt.code || "").toLowerCase();
      return (
        opt.label.toLowerCase().includes(term) ||
        code.includes(term) ||
        String(opt.current ?? "").includes(term)
      );
    });
  }, [catalogOptions, drugSearch]);

  const selectedDrug = useMemo(() => {
    const id = Number(adjustForm.drug_id);
    if (!id) return null;
    return catalogOptions.find((opt) => Number(opt.id) === id) || null;
  }, [adjustForm.drug_id, catalogOptions]);

  async function handleAdjustSubmit(e) {
    e.preventDefault();
    setAdjustError(null);
    setAdjustSuccess("");

    const drugId = adjustForm.drug_id;
    const qty = Number(adjustForm.qty);

    if (!drugId) {
      setAdjustError("Select a drug.");
      return;
    }
    if (!Number.isFinite(qty) || qty === 0) {
      setAdjustError("Enter a non-zero quantity.");
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await fetch("/api/proxy/pharmacy/stock/adjust/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug_id: Number(drugId),
          qty,
          note: adjustForm.note || "",
        }),
      });
      if (!res.ok) {
        let msg = `Failed to adjust stock (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson && (errJson.detail || errJson.error)) {
            msg = errJson.detail || errJson.error;
          }
        } catch {}
        throw new Error(msg);
      }
      await res.json(); // we don't strictly need content
      setAdjustSuccess("Stock updated successfully.");
      setAdjustForm((f) => ({ ...f, qty: "", note: "" }));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setAdjustError(err?.message || "Failed to adjust stock.");
    } finally {
      setAdjustSubmitting(false);
    }
  }

  // --- guards ---

  if (loadingMe) {
    return (
      <main className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Checking permissions…
        </div>
      </main>
    );
  }

  if (!me || !canManage) {
    return (
      <main className="mx-auto max-w-3xl p-6 md:p-10">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <ArrowLeft className="h-4 w-4" />
          <Link
            href="/facility/pharmacy"
            className="text-sky-700 hover:underline"
          >
            Back to Pharmacy
          </Link>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          You do not have permission to manage pharmacy stock.
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      {/* soft background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

      {/* Header */}
      <header className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            <Pill className="h-3.5 w-3.5" />
            Facility Pharmacy · Stock
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Stock & inventory
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track current quantities per drug for this facility and record
            opening balances or adjustments.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Link
            href="/facility/pharmacy"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Pharmacy
          </Link>
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Boxes}
          label="Stock lines"
          value={stockStats.totalLines}
          hint="Unique drugs in this facility."
        />
        <SummaryCard
          icon={TrendingUp}
          label="Total quantity"
          value={stockStats.totalQty}
          hint="Sum of all current quantities."
        />
        <SummaryCard
          icon={TrendingDown}
          label="Low stock"
          value={stockStats.low}
          hint="Items at or below 10%."
        />
      </section>

      {/* Main content: stock table + adjust + history */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
        {/* Stock table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current stock
            </div>

            <div className="text-xs text-slate-500">
              Lines:{" "}
              <span className="font-semibold text-slate-800">
                {stockRows.length}
              </span>
            </div>
          </div>

          <div className="relative mb-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="search"
              placeholder="Search by drug name, code, strength…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {loadingStock ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading stock…
            </div>
          ) : stockError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {stockError}
            </div>
          ) : (
            <>
            <div className="max-h-[380px] overflow-y-auto rounded-lg border border-slate-100 hidden lg:block">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">
                      Drug
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Strength
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Form / Route
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Current qty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {stockRows.length ? (
                    stockRows.map((row) => {
                      const isLow = (row.current_qty || 0) <= 10;
                      return (
                        <tr
                          key={row.id || row.drugId}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="px-3 py-2 text-xs font-medium text-slate-900">
                            {row.name || "—"}
                            <span className="ml-1 font-mono text-[10px] text-slate-500">
                              {row.code ? `(${row.code})` : ""}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {row.strength || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {row.form || "—"}{" "}
                            {row.route ? `· ${row.route}` : ""}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            <span
                              className={
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                                (isLow
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700")
                              }
                            >
                              {row.current_qty ?? 0}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-xs text-slate-500"
                      >
                        No stock records yet. Use "Adjust stock" to record
                        opening balances.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 lg:hidden">
              {stockRows.length ? (
                stockRows.map((row) => {
                  const isLow = (row.current_qty || 0) <= 10;
                  return (
                    <div
                      key={row.id || row.drugId}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {row.name || "-"}
                            <span className="ml-1 font-mono text-[10px] text-slate-500">
                              {row.code ? `(${row.code})` : ""}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-600">
                            {row.strength || "-"}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-600">
                            {row.form || "-"}
                            {row.route ? ` - ${row.route}` : ""}
                          </div>
                        </div>
                        <span
                          className={
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                            (isLow
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700")
                          }
                        >
                          {row.current_qty ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
                  No stock records yet. Use "Adjust stock" to record opening
                  balances.
                </div>
              )}
            </div>
            </>
          )}
        </div>

        {/* Right column: adjust + history */}
        <div className="space-y-4">
          {/* Adjust stock form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
                <Boxes className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Adjust stock
                </div>
                <div className="text-[11px] text-slate-500">
                  Positive quantity for stock in, negative for corrections.
                </div>
              </div>
            </div>

            {catalogError && (
              <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
                {catalogError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-2 text-xs">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Drug
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDrugDropdownOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <span className="truncate text-slate-700">
                      {selectedDrug
                        ? `${selectedDrug.label}${
                            selectedDrug.code ? ` (${selectedDrug.code})` : ""
                          } · Current ${selectedDrug.current}`
                        : "Select a drug…"}
                    </span>
                    <span className="ml-2 text-slate-400">▾</span>
                  </button>

                  {drugDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                      <div className="relative border-b border-slate-100 p-2">
                        <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
                          <Search className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <input
                          autoFocus
                          type="search"
                          placeholder="Search drug, code, current…"
                          value={drugSearch}
                          onChange={(e) => setDrugSearch(e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-[11px] focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div className="max-h-56 overflow-y-auto py-1 text-[11px]">
                        {loadingCatalog ? (
                          <div className="px-2 py-2 text-slate-500">
                            Loading catalog…
                          </div>
                        ) : filteredCatalogOptions.length ? (
                          filteredCatalogOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setAdjustForm((f) => ({
                                  ...f,
                                  drug_id: String(opt.id),
                                }));
                                setDrugDropdownOpen(false);
                              }}
                              className="flex w-full items-center justify-between px-2 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                            >
                              <span className="truncate">
                                {opt.label}
                                {opt.code ? ` (${opt.code})` : ""} · Current{" "}
                                {opt.current}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="px-2 py-2 text-slate-500">
                            No matches found.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-slate-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustForm.qty}
                    onChange={(e) =>
                      setAdjustForm((f) => ({ ...f, qty: e.target.value }))
                    }
                    placeholder="e.g. 100 or -5"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-slate-700">
                    Note (optional)
                  </label>
                  <input
                    value={adjustForm.note}
                    onChange={(e) =>
                      setAdjustForm((f) => ({ ...f, note: e.target.value }))
                    }
                    placeholder="Opening balance, correction…"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {adjustError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
                  {adjustError}
                </div>
              )}
              {adjustSuccess && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
                  {adjustSuccess}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {adjustSubmitting ? "Saving…" : "Save adjustment"}
                </button>
              </div>
            </form>
          </div>

          {/* Stock history */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
                <History className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Stock history
                </div>
                <div className="text-[11px] text-slate-500">
                  Most recent movements in this facility.
                </div>
              </div>
            </div>

            {loadingTxns ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading history…
              </div>
            ) : txnsError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-800">
                {txnsError}
              </div>
            ) : txns.length === 0 ? (
              <div className="py-4 text-[11px] text-slate-500">
                No stock transactions yet.
              </div>
            ) : (
              <div className="max-h-[260px] overflow-y-auto">
                <ul className="space-y-1 text-[11px]">
                  {txns.slice(0, 40).map((txn) => {
                    const drug = txn.drug || {};
                    const created = formatDateTime(txn.created_at);
                    const q = Number(txn.qty) || 0;
                    const isIn = q > 0;
                    const isOut = q < 0;
                    const badgeCls = isIn
                      ? "bg-emerald-50 text-emerald-700"
                      : isOut
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-50 text-slate-700";
                    const sign = q > 0 ? "+" : "";
                    const user =
                      txn.created_by_name
                      "";

                    return (
                      <li
                        key={txn.id}
                        className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5"
                      >
                        <div className="pr-2">
                          <div className="text-[11px] font-medium text-slate-900">
                            {txn.drug_name || "Drug"}
                            <span className="ml-1 font-mono text-[10px] text-slate-500">
                              {txn.drug_code ? `(${txn.drug_code})` : ""}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            {txn.note || "No note"}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {created}
                            {user ? ` · ${user}` : ""}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                              badgeCls
                            }
                          >
                            {sign}
                            {q}
                          </span>
                          <span className="text-[9px] uppercase tracking-wide text-slate-400">
                            {txn.txn_type || ""}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
          )}
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}
