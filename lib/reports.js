// lib/reports.js
"use client";

/**
 * Payload matches backend GenerateReportSerializer:
 *
 * {
 *   report_type: "ENCOUNTER" | "LAB" | "IMAGING" | "BILLING",
 *   ref_id: number|string,
 *   as_pdf?: boolean,
 *   save_as_attachment?: boolean,
 *   start?: string|null,
 *   end?: string|null
 * }
 */
export async function downloadReport(payload) {
  const cleaned = { ...payload };

  if (cleaned.start == null) delete cleaned.start;
  if (cleaned.end == null) delete cleaned.end;
  if (cleaned.as_pdf == null) cleaned.as_pdf = true;
  if (cleaned.save_as_attachment == null) cleaned.save_as_attachment = false;

  const res = await fetch("/api/bff/reports/generate", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify(cleaned),
  });

  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    // backend errors are json most of the time
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      const msg =
        data?.detail ||
        data?.message ||
        (typeof data === "string" ? data : null) ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Prefer content-type, but also guard against "HTML returned as PDF" corruption.
  const looksLikePdfType =
    contentType.includes("application/pdf") || contentType.includes("application/octet-stream");

  if (looksLikePdfType) {
    const blob = await res.blob();

    // Validate header so we don't download a corrupt file.
    // PDF signature should start with "%PDF-".
    const headBuf = await blob.slice(0, 5).arrayBuffer();
    const head = new TextDecoder("utf-8").decode(headBuf);

    if (head !== "%PDF-") {
      // Try to show what we actually received (often HTML).
      const asText = await blob.text().catch(() => "");
      if (asText.trim().startsWith("<!doctype html") || asText.trim().startsWith("<html")) {
        const win = window.open("", "_blank");
        if (win && win.document) {
          win.document.open();
          win.document.write(asText);
          win.document.close();
        }
        throw new Error(
          "Server returned HTML instead of a real PDF. Check backend PDF engine (WeasyPrint dependencies)."
        );
      }

      throw new Error(
        "Downloaded file is not a valid PDF. Check backend PDF generation (WeasyPrint)."
      );
    }

    const cd = res.headers.get("content-disposition") || "";
    let filename = "report.pdf";
    const match = cd.match(/filename="?(.*?)"?$/i);
    if (match && match[1]) {
      filename = match[1];
    } else if (cleaned?.report_type && cleaned?.ref_id) {
      filename = `${String(cleaned.report_type).toLowerCase()}-${cleaned.ref_id}.pdf`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // HTML response (e.g., backend intentionally returned HTML)
  if (contentType.includes("text/html")) {
    const html = await res.text();
    const win = window.open("", "_blank");
    if (win && win.document) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
    return;
  }

  // JSON response (rare success case) → show it
  if (contentType.includes("application/json")) {
    const json = await res.json().catch(() => ({}));
    const win = window.open("", "_blank");
    if (win && win.document) {
      win.document.open();
      win.document.write(`<pre>${JSON.stringify(json, null, 2)}</pre>`);
      win.document.close();
    }
    return;
  }

  // Fallback
  const text = await res.text();
  const win = window.open("", "_blank");
  if (win && win.document) {
    win.document.open();
    win.document.write(`<pre>${text}</pre>`);
    win.document.close();
  }
}

// Convenience helpers
export function downloadEncounterPdf(encounterId) {
  if (!encounterId) return;
  return downloadReport({
    report_type: "ENCOUNTER",
    ref_id: encounterId,
    as_pdf: true,
    save_as_attachment: false,
  });
}

export function downloadLabPdf(labId) {
  if (!labId) return;
  return downloadReport({
    report_type: "LAB",
    ref_id: labId,
    as_pdf: true,
    save_as_attachment: false,
  });
}

export function downloadImagingPdf(imagingId) {
  if (!imagingId) return;
  return downloadReport({
    report_type: "IMAGING",
    ref_id: imagingId,
    as_pdf: true,
    save_as_attachment: false,
  });
}

export function downloadBillingPdf(refId, { start = null, end = null } = {}) {
  if (!refId) return;
  return downloadReport({
    report_type: "BILLING",
    ref_id: refId,
    as_pdf: true,
    save_as_attachment: false,
    start,
    end,
  });
}

export function downloadBillingReceipt(chargeId) {
  if (!chargeId) return;
  return downloadBillingPdf(chargeId); // Uses charge ID as ref_id
}

export function downloadBillingStatement(patientId, { start = null, end = null } = {}) {
  if (!patientId) return;
  return downloadBillingPdf(patientId, { start, end }); // Uses patient ID as ref_id
}