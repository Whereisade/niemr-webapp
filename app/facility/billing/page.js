"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCharges } from "@/lib/useCharges";
import { useBillingLedger } from "@/lib/useBillingLedger";
import { downloadReport, downloadBillingPdf } from "@/lib/reports";

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

function formatMoney(v) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FacilityBillingPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(sp.get("page") || 1);
  const limit = Number(sp.get("limit") || 20);
  const status = sp.get("status") || "";
  const patient = sp.get("patient") || "";
  const s = sp.get("s") || "";

  const { data, error, isLoading } = useCharges({
    page,
    limit,
    status,
    patient,
    s,
  });

  const hasPatient = Boolean(patient);

  const {
    data: ledger,
    error: ledgerError,
    isLoading: ledgerLoading,
  } = useBillingLedger(
    hasPatient ? { patient } : {},
    { enabled: hasPatient }
  );

  const [downloadingId, setDownloadingId] = useState(null);

  async function handleReceiptDownload(ch) {
    if (!ch?.id) return;
    try {
      setDownloadingId(ch.id);
      await downloadBillingPdf(ch.id);
    } catch (err) {
      console.error("Failed to download billing receipt", err);
      alert(
        err?.message || "Failed to download receipt. Please try again."
      );
    } finally {
      setDownloadingId(null);
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
    if (
      "status" in patch ||
      "patient" in patch ||
      "s" in patch ||
      "limit" in patch
    ) {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const rawCharges =
    ledger?.charges_total ??
    (ledger && ledger["charges...al"]) ??
    0;
  const rawPayments = ledger?.payments_total ?? 0;
  const rawBalance =
    ledger?.balance ?? (Number(rawCharges) - Number(rawPayments));

  if (isLoading && !data) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          Facility Billing – Charges
        </h1>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
          Loading charges…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 mb-4">
          Facility Billing – Charges
        </h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load: {error.message || "Unknown error"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Facility Billing – Charges
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Charges raised for all patients in this facility. Enter a
            patient to view their balance.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search description / service…"
            defaultValue={s}
            onBlur={(e) => updateQuery({ s: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-56"
          />
          <input
            type="text"
            placeholder="Filter by patient ID…"
            defaultValue={patient}
            onBlur={(e) => updateQuery({ patient: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-56"
          />
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-40"
            value={status}
            onChange={(e) => updateQuery({ status: e.target.value })}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-32"
            value={String(limit)}
            onChange={(e) => updateQuery({ limit: e.target.value })}
          >
            <option value="20">Show 20</option>
            <option value="50">Show 50</option>
            <option value="100">Show 100</option>
          </select>
          <button
            type="button"
            disabled={!hasPatient || ledgerLoading}
            onClick={async () => {
              try {
                if (!patient) {
                  alert("Enter a patient ID first.");
                  return;
                }
                await downloadReport({
                  report_type: "BILLING",
                  ref_id: patient,
                  as_pdf: true,
                  save_as_attachment: false,
                });
              } catch (err) {
                alert(
                  err?.message ||
                    "Failed to generate billing statement. Please try again."
                );
              }
            }}
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Download Patient Statement (PDF)
          </button>
        </div>
      </header>

      {/* Ledger summary */}
      {hasPatient && (
        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Patient Billing Summary
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Charges, payments, and balance for patient ID:{" "}
                <span className="font-mono">{patient}</span>
              </p>
              {ledgerError && (
                <p className="mt-1 text-xs text-rose-600">
                  Failed to load ledger summary:{" "}
                  {ledgerError.message || "Unknown error"}
                </p>
              )}
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                <dt className="text-xs font-medium text-slate-500">
                  Charges
                </dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {formatMoney(rawCharges)}
                </dd>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                <dt className="text-xs font-medium text-slate-500">
                  Payments
                </dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {formatMoney(rawPayments)}
                </dd>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                <dt className="text-xs font-medium text-slate-500">
                  Balance
                </dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {formatMoney(rawBalance)}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      )}

      {/* Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Charges ({total})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created At
                </th>
                {/* NEW Receipt column */}
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((ch) => (
                <tr key={ch.id} className="hover:bg-slate-50">
                  <td className="p-3 text-sm text-slate-800">
                    {ch.patient || ch.patient_id || "—"}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {ch.description || `Service #${ch.service}` || "—"}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {ch.status || "—"}
                  </td>
                  <td className="p-3 text-sm text-right text-slate-800">
                    {formatMoney(ch.amount)}
                  </td>
                  <td className="p-3 text-sm text-slate-800">
                    {formatDateTime(ch.created_at)}
                  </td>
                  {/* NEW Receipt cell */}
                  <td className="p-3 text-sm text-right">
                    <button
                      type="button"
                      onClick={() => handleReceiptDownload(ch)}
                      disabled={downloadingId === ch.id}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingId === ch.id ? "Generating…" : "PDF"}
                    </button>
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td
                    className="p-4 text-center text-sm text-slate-500"
                    colSpan={6}
                  >
                    No charges found.
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
