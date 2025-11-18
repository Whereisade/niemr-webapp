// lib/reports.js
"use client";

/**
 * Payload shape matches backend GenerateRequestSerializer:
 *
 * {
 *   report_type: "ENCOUNTER" | "LAB" | "IMAGING" | "BILLING",
 *   ref_id: number,
 *   as_pdf?: boolean,            // default true
 *   save_as_attachment?: boolean,
 *   start?: string | null,       // only for BILLING
 *   end?: string | null          // only for BILLING
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

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    // try to parse error as JSON; otherwise plain text
    if (contentType.includes("application/json")) {
      const data = await res.json();
      const msg =
        data?.detail ||
        data?.message ||
        JSON.stringify(data) ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    } else {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  // PDF
  if (contentType.includes("application/pdf")) {
    const blob = await res.blob();

    // try to read filename from Content-Disposition
    const cd = res.headers.get("content-disposition") || "";
    let filename = "report.pdf";
    const match = cd.match(/filename="?(.*?)"?$/i);
    if (match && match[1]) {
      filename = match[1];
    } else if (cleaned?.report_type && cleaned?.ref_id) {
      filename = `${String(cleaned.report_type).toLowerCase()}-${
        cleaned.ref_id
      }.pdf`;
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

  // HTML
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

  // Fallback: just treat as text
  const text = await res.text();
  const win = window.open("", "_blank");
  if (win && win.document) {
    win.document.open();
    win.document.write(`<pre>${text}</pre>`);
    win.document.close();
  }
}
