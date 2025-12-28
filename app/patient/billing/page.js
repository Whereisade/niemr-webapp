// app/patient/billing/page.js
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCharges } from "@/lib/useCharges";
import { useBillingLedger } from "@/lib/useBillingLedger";
import { downloadBillingPdf } from "@/lib/reports";
import { FileDown, Receipt, Loader2, AlertCircle } from "lucide-react";


export default function PatientBillingPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <PatientBillingPageInner {...props} />
    </Suspense>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "PARTIALLY_PAID":
    case "PARTIAL":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "UNPAID":
    case "PENDING":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "VOID":
    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getStatusLabel(status) {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "PARTIALLY_PAID":
      return "Partial";
    default:
      return status || "—";
  }
}

function PatientBillingPageInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const status = sp.get("status") || "";

  const { data, error, isLoading, mutate } = useCharges({
    page,
    limit,
    status,
  });

  const {
    data: ledger,
    error: ledgerError,
    isLoading: ledgerLoading,
  } = useBillingLedger();

  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingStatement, setDownloadingStatement] = useState(false);

  async function handleReceiptDownload(ch) {
    if (!ch?.id) return;
    try {
      setDownloadingId(ch.id);
      await downloadBillingPdf(ch.id); // Charge ID → receipt
    } catch (err) {
      console.error("Failed to download billing receipt", err);
      alert(err?.message || "Failed to download receipt. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleStatementDownload() {
    try {
      setDownloadingStatement(true);
      const pid = ledger?.patient_id;
      if (!pid) {
        alert("Unable to determine your patient ID for billing statement.");
        return;
      }
      await downloadBillingPdf(pid); // Patient ID → statement
    } catch (err) {
      console.error("Failed to download billing statement", err);
      alert(
        err?.message ||
          "Failed to generate billing statement. Please try again."
      );
    } finally {
      setDownloadingStatement(false);
    }
  }

  const rows = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
  const total = Number(data?.count ?? rows.length);

  const updateQuery = (patch) => {
    const params = new URLSearchParams(sp?.toString() || "");
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    if ("status" in patch || "limit" in patch) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Normalize ledger keys (backend might use different field names)
  const rawCharges = ledger?.charges_total ?? 0;
  const rawPayments = ledger?.payments_total ?? 0;
  const rawBalance = ledger?.balance ?? Number(rawCharges) - Number(rawPayments);

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Loading your billing information…
          </h1>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          My Billing
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-900 text-sm">
              Error loading billing information
            </div>
            <div className="text-sm text-rose-700 mt-1">
              {error.message || "Unknown error"}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            My Billing
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            View your charges, payments, and current balance.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:w-40"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partial</option>
            <option value="PAID">Paid</option>
            <option value="VOID">Void</option>
          </select>

          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:w-40"
            value={String(limit)}
            onChange={(e) => updateQuery({ limit: e.target.value })}
          >
            <option value="10">Show 10</option>
            <option value="20">Show 20</option>
            <option value="50">Show 50</option>
          </select>

          <button
            type="button"
            disabled={!ledger || ledgerLoading || downloadingStatement}
            onClick={handleStatementDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            {downloadingStatement ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Download Statement
              </>
            )}
          </button>
        </div>
      </header>

      {/* Ledger Summary */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-6 shadow-sm">
        {ledgerError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-rose-900 text-sm">
                Error loading summary
              </div>
              <div className="text-sm text-rose-700 mt-1">
                {ledgerError.message || "Unknown error"}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Billing Summary
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Your account balance and payment status
                </p>
              </div>
              {ledgerLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              )}
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
                <dt className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Total Charges
                </dt>
                <dd className="mt-2 text-2xl font-bold text-slate-900">
                  ₦{formatMoney(rawCharges)}
                </dd>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
                <dt className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Total Payments
                </dt>
                <dd className="mt-2 text-2xl font-bold text-emerald-700">
                  ₦{formatMoney(rawPayments)}
                </dd>
              </div>

              <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
                <dt className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Balance Due
                </dt>
                <dd
                  className={`mt-2 text-2xl font-bold ${
                    Number(rawBalance) > 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  ₦{formatMoney(rawBalance)}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      {/* Charges Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Charges
              {total > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({total} total)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Itemized list of all charges on your account
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Description
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Amount
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Date
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((ch) => (
                <tr key={ch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900 text-sm">
                      {ch.service_name || ch.description || `Service #${ch.service}` || "—"}
                    </div>
                    {ch.description && ch.service_name && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {ch.description}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                        ch.status
                      )}`}
                    >
                      {getStatusLabel(ch.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900 text-sm">
                    ₦{formatMoney(ch.amount)}
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-sm">
                    {formatDateTime(ch.created_at)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleReceiptDownload(ch)}
                      disabled={downloadingId === ch.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                    >
                      {downloadingId === ch.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating…</span>
                        </>
                      ) : (
                        <>
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td
                    className="px-5 py-12 text-center text-sm text-slate-500"
                    colSpan={5}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-8 w-8 text-slate-300" />
                      <div>
                        <div className="font-medium text-slate-700">
                          No charges found
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {status
                            ? "Try adjusting your filters"
                            : "You don't have any charges yet"}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 bg-slate-50">
            <div className="text-sm text-slate-600">
              Showing {Math.min((page - 1) * limit + 1, total)} to{" "}
              {Math.min(page * limit, total)} of {total} charges
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateQuery({ page: page - 1 })}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page * limit >= total}
                onClick={() => updateQuery({ page: page + 1 })}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}