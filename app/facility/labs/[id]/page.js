// app/facility/labs/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FlaskConical,
  ArrowLeft,
  User,
  Building2,
  Stethoscope,
  FileText,
  Paperclip,
  Loader2,
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

  if (Array.isArray(body.results)) {
    return body.results;
  }

  if (Array.isArray(body)) {
    return body;
  }

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

function statusChipClasses(status) {
  const v = String(status || "").toUpperCase();
  if (v === "PENDING") return "bg-amber-50 text-amber-700 border-amber-100";
  if (v === "COLLECTED") return "bg-sky-50 text-sky-700 border-sky-100";
  if (v === "REPORTED") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (v === "CANCELLED") return "bg-red-50 text-red-700 border-red-100";
  return "bg-slate-50 text-slate-600 border-slate-100";
}

export default function FacilityLabOrderDetailPage() {
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
        console.error("Failed to load lab order", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load lab order details. Please try again."
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

  // Load attachments
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
        console.error("Failed to load lab order attachments", err);
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
      ? `${order?.patient_first_name || ""} ${order?.patient_last_name || ""}`.trim()
      : "") ||
    order?.patient ||
    "—";

  const facilityName = order?.facility_name || order?.facility?.name || "—";

  const orderedBy =
    order?.ordered_by_name ||
    (order?.ordered_by_first_name || order?.ordered_by_last_name
      ? `${order?.ordered_by_first_name || ""} ${
          order?.ordered_by_last_name || ""
        }`.trim()
      : "") ||
    order?.ordered_by ||
    "—";

  const priority = order?.priority || "—";
  const status = order?.status || "—";

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
            return i.test_name || i.test_code || i.code || "Unnamed test";
          })
          .join(", ")
      : order?.tests_display || "—";

  const orderedDate = order?.ordered_at ? formatDate(order.ordered_at) : "—";

  return (
    <main className="relative mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* soft background accents */}
      <div className="pointer-events-none absolute -top-28 -left-32 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-32 h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl" />

      {/* Page header */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
              <FlaskConical className="h-3.5 w-3.5" />
              Lab order
            </div>
            <h1 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
              Lab order details
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Facility view of this lab order, including patient, tests, priority, and
              any attached files.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status && status !== "—" && (
            <span
              className={
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium " +
                statusChipClasses(status)
              }
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {status}
            </span>
          )}
          {orderedDate !== "—" && (
            <span className="inline-flex items-center rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-medium text-white shadow-sm">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Ordered {orderedDate}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="relative rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="-mx-5 -mt-5 mb-4 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading lab order…</span>
          </div>
        </div>
      )}

      {!loading && !error && !order && (
        <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Lab order not found.
        </div>
      )}

      {!loading && order && (
        <section className="relative space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* meta strip */}
          <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          {/* Top summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Patient
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {patientName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                <Building2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Facility
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {facilityName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                <Stethoscope className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Ordered by
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {orderedBy}
                </p>
              </div>
            </div>
          </div>

          {/* Second row: ordered at / priority / external lab */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Ordered at
              </p>
              <p className="text-sm text-slate-900">
                {formatDateTime(order.ordered_at || order.created_at)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Priority
              </p>
              <p className="text-sm text-slate-900">{priority}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                External lab
              </p>
              <p className="text-sm text-slate-900">
                {order.external_lab_name || "—"}
              </p>
            </div>
          </div>

          {/* Tests */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Tests requested
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {tests}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Clinical note
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
              {order.note || "No additional note for this lab order."}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-slate-500" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Attachments
              </p>
            </div>

            {attachmentsLoading && (
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading attachments…</span>
              </p>
            )}

            {attachmentsError && (
              <p className="text-xs text-red-600">{attachmentsError}</p>
            )}

            {!attachmentsLoading &&
              !attachmentsError &&
              attachments.length === 0 && (
                <p className="text-xs text-slate-500">
                  No files attached to this lab order yet.
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
                    att.original_name ||
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
                          className="ml-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-blue-600 shadow-sm hover:bg-blue-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Open
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer nav */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <Link
              href="/facility/labs"
              className="text-slate-600 hover:text-slate-900"
            >
              Back to lab orders
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
