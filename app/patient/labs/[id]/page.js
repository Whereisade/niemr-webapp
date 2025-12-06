// app/patient/labs/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { downloadLabPdf } from "@/lib/reports";

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

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function normalizeAttachmentsPayload(body) {
  if (!body) return [];

  // DRF paginated
  if (Array.isArray(body.results)) {
    return body.results;
  }

  // Plain list
  if (Array.isArray(body)) {
    return body;
  }

  // Numeric-key object from BFF spread
  if (body && typeof body === "object") {
    const numericKeys = Object.keys(body).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }

  return [];
}

export default function PatientLabOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");

  // Load lab order
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const data = await apiFetch(`/labs/orders/${id}/`, {
          method: "GET",
        });

        if (cancelled) return;
        setOrder(data);
      } catch (err) {
        console.error("Failed to load patient lab order", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load lab order details. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrder();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load attachments (read-only)
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadAttachments() {
      try {
        setAttachmentsLoading(true);
        setAttachmentsError("");

        const qs = new URLSearchParams();
        qs.set("owner_type", "lab_order");
        qs.set("owner_id", String(id));

        const body = await apiFetch(`/attachments/?${qs.toString()}`, {
          method: "GET",
        });

        if (cancelled) return;

        const items = normalizeAttachmentsPayload(body);
        setAttachments(items);
      } catch (err) {
        console.error("Failed to load lab order attachments (patient)", err);
        if (!cancelled) {
          setAttachmentsError(
            err?.message ||
              "Attachments could not be loaded for this lab order."
          );
          setAttachments([]);
        }
      } finally {
        if (!cancelled) setAttachmentsLoading(false);
      }
    }

    loadAttachments();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing lab order ID in URL.
        </div>
      </main>
    );
  }

  const patientName =
    order?.patient_name ||
    (order?.patient_first_name || order?.patient_last_name
      ? `${order?.patient_first_name || ""} ${
          order?.patient_last_name || ""
        }`.trim()
      : "") ||
    order?.patient ||
    "—";

  const facilityName =
    order?.facility_name || order?.facility?.name || "—";

  const orderedBy =
    order?.ordered_by_name ||
    (order?.ordered_by_first_name || order?.ordered_by_last_name
      ? `${order?.ordered_by_first_name || ""} ${
          order?.ordered_by_last_name || ""
        }`.trim()
      : "") ||
    order?.ordered_by ||
    "—";

  const status = order?.status || "—";
  const priority = order?.priority || "—";

  const tests =
    Array.isArray(order?.items) && order.items.length
      ? order.items
          .map((i) => {
            if (i.test?.name || i.test?.code) {
              if (i.test.name && i.test.code) {
                return `${i.test.name} (${i.test.code})`;
              }
              return i.test.name || i.test.code;
            }
            return i.test_name || i.test_code || i.code || "Lab test";
          })
          .join(", ")
      : order?.tests_display || "—";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <header className="mb-6 space-y-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Left: back + title */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back
            </button>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
              Lab test details
            </h1>
            <p className="text-sm text-slate-600">
              This page shows a read-only summary of a lab test request
              recorded for you.
            </p>
          </div>

          {/* Right: status + download */}
          <div className="flex items-center gap-2">
            {status && status !== "—" && (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  status === "PENDING"
                    ? "bg-amber-50 text-amber-700"
                    : status === "COLLECTED"
                    ? "bg-sky-50 text-sky-700"
                    : status === "REPORTED"
                    ? "bg-emerald-50 text-emerald-700"
                    : status === "CANCELLED"
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                {status}
              </span>
            )}

            <button
              type="button"
              onClick={() => downloadLabPdf(id)}
              className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Loading lab test…
        </div>
      )}

      {!loading && !error && !order && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Lab order not found.
        </div>
      )}

      {!loading && order && (
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Top summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                For
              </p>
              <p className="text-sm font-medium text-slate-900">
                {patientName}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Facility
              </p>
              <p className="text-sm font-medium text-slate-900">
                {facilityName}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Requested by
              </p>
              <p className="text-sm font-medium text-slate-900">
                {orderedBy}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Requested at
              </p>
              <p className="text-sm font-medium text-slate-900">
                {formatDateTime(order.ordered_at)}
              </p>
            </div>
          </div>

          {/* Priority */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Priority
              </p>
              <p className="text-sm text-slate-900">{priority}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                External lab (if any)
              </p>
              <p className="text-sm text-slate-900">
                {order.external_lab_name || "—"}
              </p>
            </div>
          </div>

          {/* Tests */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tests requested
            </p>
            <p className="text-sm text-slate-900">{tests}</p>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Note
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
              {order.note || "No additional note for this lab order."}
            </div>
          </div>

          {/* Attachments (read-only) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attachments
            </p>

            {attachmentsLoading && (
              <p className="text-xs text-slate-500">
                Loading attachments…
              </p>
            )}

            {attachmentsError && (
              <p className="text-xs text-red-600">
                {attachmentsError}
              </p>
            )}

            {!attachmentsLoading &&
              !attachmentsError &&
              attachments.length === 0 && (
                <p className="text-xs text-slate-500">
                  No files attached to this lab test yet.
                </p>
              )}

            {!attachmentsLoading && attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((att) => {
                  const fileUrl =
                    att.file || att.url || att.download_url || "#";

                  const nameFromPath =
                    typeof att.file === "string"
                      ? att.file.split("/").slice(-1)[0]
                      : null;

                  const label =
                    att.filename ||
                    att.name ||
                    nameFromPath ||
                    `Attachment #${att.id}`;

                  return (
                    <li
                      key={att.id || `${label}-${fileUrl}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {label}
                        </span>
                        {att.description && (
                          <span className="mt-0.5 text-[11px] text-slate-600">
                            {att.description}
                          </span>
                        )}
                        {att.created_at && (
                          <span className="mt-0.5 text-[11px] text-slate-500">
                            Uploaded {formatDateTime(att.created_at)}
                          </span>
                        )}
                      </div>
                      {fileUrl && fileUrl !== "#" && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          Open
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <Link
              href="/patient/labs"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to lab tests
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
