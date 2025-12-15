"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export default function ProviderPharmacyStockPage() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [stock, setStock] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockError, setStockError] = useState(null);

  const [txns, setTxns] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [txnsError, setTxnsError] = useState(null);

  const [search, setSearch] = useState("");

  // --- load current provider user ---
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
  const facility = me?.facility || null;

  // --- load stock + txns once we know the user ---
  useEffect(() => {
    if (!me) {
      setLoadingStock(false);
      setLoadingTxns(false);
      return;
    }

    let cancelled = false;

    async function loadAll() {
      setLoadingStock(true);
      setLoadingTxns(true);
      setStockError(null);
      setTxnsError(null);

      try {
        const [stockRes, txnsRes] = await Promise.all([
          fetch("/api/proxy/pharmacy/stock/", { cache: "no-store" }),
          fetch("/api/proxy/pharmacy/stock/txns/", { cache: "no-store" }),
        ]);

        if (!cancelled) {
          if (!stockRes.ok) {
            throw new Error(`Failed to load stock (${stockRes.status})`);
          }
          if (!txnsRes.ok) {
            throw new Error(
              `Failed to load stock history (${txnsRes.status})`
            );
          }

          const [stockJson, txnsJson] = await Promise.all([
            stockRes.json(),
            txnsRes.json(),
          ]);

          setStock(normaliseList(stockJson));
          setTxns(normaliseList(txnsJson));
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.message ||
            "Failed to load stock information for this facility.";
          setStockError(msg);
          setTxnsError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoadingStock(false);
          setLoadingTxns(false);
        }
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [me]);

  // --- derived rows & stats (read-only) ---

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
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [stock, search]);

  const stockStats = useMemo(() => {
    const totalLines = stockRows.length;
    let totalQty = 0;
    let low = 0;
    for (const r of stockRows) {
      const q = Number(r.current_qty) || 0;
      totalQty += q;
      if (q <= 10) low += 1;
    }
    return { totalLines, totalQty, low };
  }, [stockRows]);

  // --- guards ---

  if (loadingMe) {
    return (
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Checking provider profile…
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="mx-auto max-w-3xl p-6 md:p-10">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <ArrowLeft className="h-4 w-4" />
          <Link
            href="/provider"
            className="text-sky-700 hover:underline"
          >
            Back to Provider dashboard
          </Link>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          You must be logged in as a provider to view facility stock.
        </div>
      </main>
    );
  }

  const headerBadgeText =
    meRole === "PHARMACY"
      ? "Independent Pharmacy · Facility stock"
      : "Provider · Facility stock";

  const headerSubtitle = facility
    ? "Read-only view of pharmacy stock in your current facility."
    : "You are not currently linked to any facility. Stock data may be empty.";

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
            {headerBadgeText}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Stock & inventory (read only)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {headerSubtitle}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Link
            href="/provider/pharmacy"
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
          hint="Items at or below 10 units."
        />
      </section>

      {/* Main content: stock table + history (both read-only) */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
        {/* Stock table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current stock (read only)
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
            <div className="max-h-[380px] overflow-y-auto rounded-lg border border-slate-100">
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
                        No stock records found for this facility.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: stock history (read only) */}
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
                Recent movements recorded by pharmacy/admin.
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
                    txn.created_by?.full_name ||
                    txn.created_by?.email ||
                    "";

                  return (
                    <li
                      key={txn.id}
                      className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5"
                    >
                      <div className="pr-2">
                        <div className="text-[11px] font-medium text-slate-900">
                          {drug.name || "Drug"}
                          <span className="ml-1 font-mono text-[10px] text-slate-500">
                            {drug.code ? `(${drug.code})` : ""}
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
