"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Download,
  ScanLine,
  Users,
  Building2,
} from "lucide-react";

import {
  downloadEncounterPdf,
  downloadLabPdf,
  downloadImagingPdf,
  downloadBillingPdf,
} from "@/lib/reports";

const REPORT_TYPES = [
  {
    id: "encounter",
    label: "Encounter summary",
    description: "Clinical notes and vitals for a single encounter.",
    helper: "Use the Encounter ID from the Encounters list.",
    icon: FileText,
  },
  {
    id: "lab",
    label: "Lab result",
    description: "Pathology or lab investigation report for one order.",
    helper: "Use the Lab Order ID from the Labs list.",
    icon: FlaskIcon, // we’ll define this below as a simple alias
  },
  {
    id: "imaging",
    label: "Imaging report",
    description: "Radiology / imaging report for one request.",
    helper: "Use the Imaging Request ID from the Imaging list.",
    icon: ScanLine,
  },
  {
    id: "billing",
    label: "Billing statement",
    description: "Payments, charges and balances for a patient statement.",
    helper: "Use the Patient ID (or a Charge ID for a single-charge receipt). Date range optional.",
    icon: ReceiptIcon, // simple alias too
  },
];

// Simple icon aliases using existing lucide icons you already have installed
function FlaskIcon(props) {
  return <Building2 {...props} />; // re-use Building2 as a generic “facility” icon
}

function ReceiptIcon(props) {
  return <Users {...props} />; // re-use Users as a generic “billing” icon
}

export default function FacilityReportsPage() {
  const [type, setType] = useState("encounter");
  const [refId, setRefId] = useState("");
  const [billingStart, setBillingStart] = useState("");
  const [billingEnd, setBillingEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleDownload(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!refId.trim()) {
      setError("Please enter a valid reference ID.");
      return;
    }

    try {
      setLoading(true);

      if (type === "encounter") {
        await downloadEncounterPdf(refId.trim());
      } else if (type === "lab") {
        await downloadLabPdf(refId.trim());
      } else if (type === "imaging") {
        await downloadImagingPdf(refId.trim());
      } else if (type === "billing") {
        await downloadBillingPdf(refId.trim(), {
          start: billingStart || undefined,
          end: billingEnd || undefined,
        });
      }

      setMessage(
        "Report request successful. Your browser should start downloading the PDF."
      );
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Something went wrong while generating the report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const activeType = REPORT_TYPES.find((r) => r.id === type);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 lg:px-8">
      {/* Header / breadcrumb */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            <Link href="/facility" className="inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to facility home</span>
            </Link>
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            Reports & PDFs
          </h1>
          <p className="text-xs text-slate-500">
            Generate encounter, lab, imaging and billing PDFs directly from the
            NIEMR backend.
          </p>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {message}
        </div>
      )}

      {/* Report type selector */}
      <section className="mb-6">
        <p className="mb-2 text-xs font-medium text-slate-500">
          Select report type
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REPORT_TYPES.map((r) => {
            const Icon = r.icon;
            const isActive = r.id === type;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setType(r.id)}
                className={[
                  "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                  isActive
                    ? "border-slate-900 bg-slate-900/90 text-white shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50",
                ].join(" ")}
              >
                <div
                  className={[
                    "mt-0.5 grid h-8 w-8 place-items-center rounded-lg border text-xs",
                    isActive
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <p
                    className={[
                      "text-xs font-semibold",
                      isActive ? "text-white" : "text-slate-900",
                    ].join(" ")}
                  >
                    {r.label}
                  </p>
                  <p
                    className={[
                      "text-[11px]",
                      isActive ? "text-slate-100" : "text-slate-500",
                    ].join(" ")}
                  >
                    {r.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Form */}
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <form className="space-y-4" onSubmit={handleDownload}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Reference ID
            </label>
            <input
              type="text"
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none ring-0 transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
              placeholder={
                activeType?.id === "encounter"
                  ? "e.g. 123 or EN-000123"
                  : activeType?.id === "lab"
                  ? "e.g. 456 or LAB-000456"
                  : activeType?.id === "imaging"
                  ? "e.g. 789 or IMG-000789"
                  : "e.g. Patient ID (e.g. 321)"
              }
            />
            {activeType?.helper && (
              <p className="text-[11px] text-slate-500">{activeType.helper}</p>
            )}
          </div>

          {/* Billing-only date range */}
          {type === "billing" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Start date (optional)
                </label>
                <input
                  type="date"
                  value={billingStart}
                  onChange={(e) => setBillingStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none ring-0 transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  End date (optional)
                </label>
                <input
                  type="date"
                  value={billingEnd}
                  onChange={(e) => setBillingEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none ring-0 transition focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900"
                />
                <p className="text-[11px] text-slate-500">
                  Leave blank to include all billing records for this ID.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-400">
              The PDF will be generated by the backend and downloaded in your
              browser.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <Download className="h-3 w-3 animate-bounce" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="h-3 w-3" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
