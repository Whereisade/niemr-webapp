"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  downloadEncounterPdf,
  downloadLabPdf,
  downloadImagingPdf,
  downloadBillingPdf,
} from "@/lib/reports";

/**
 * type: "encounter" | "lab" | "imaging" | "billing"
 * refId: string (the reference or ID to send to the backend)
 */
export default function DownloadReportButton({
  type = "encounter",
  refId,
  startDate,
  endDate,
  className = "",
  size = "sm",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (!refId) {
      setError("Missing reference ID.");
      return;
    }

    setError("");

    try {
      setLoading(true);

      if (type === "encounter") {
        await downloadEncounterPdf(refId);
      } else if (type === "lab") {
        await downloadLabPdf(refId);
      } else if (type === "imaging") {
        await downloadImagingPdf(refId);
      } else if (type === "billing") {
        await downloadBillingPdf(refId, {
          start: startDate || undefined,
          end: endDate || undefined,
        });
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Failed to generate PDF. Please try again or contact support."
      );
    } finally {
      setLoading(false);
    }
  }

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-1.5 text-[11px]"
      : "px-3 py-2 text-xs";

  return (
    <div className={`space-y-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !refId}
        className={[
          "inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white font-medium shadow-sm transition",
          "hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400",
          sizeClasses,
        ].join(" ")}
      >
        <Download className="h-3.5 w-3.5" />
        <span>{loading ? "Preparing PDF..." : "Download PDF"}</span>
      </button>
      {error && (
        <p className="text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
