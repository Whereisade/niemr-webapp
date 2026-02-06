// app/patient/labs/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { downloadLabPdf } from "@/lib/reports";
import { getLabStatusMeta } from "@/lib/LabsUiConfig";
import {
  FlaskConical,
  ArrowLeft,
  DownloadCloud,
  Building2,
  UserRound,
  Clock,
  ClipboardList,
  FileText,
  Paperclip,
  Info,
} from "lucide-react";

function formatDateTime(value) {
  if (!value) return "\u2014";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function formatDate(value) {
  if (!value) return "\u2014";
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
      <main className="mx-auto max-w-5xl p-6 md:p-10">
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
    "\u2014";

  const facilityName = order?.facility_name || order?.facility?.name || "\u2014";

  const orderedBy =
    order?.ordered_by_name ||
    (order?.ordered_by_first_name || order?.ordered_by_last_name
      ? `${order?.ordered_by_first_name || ""} ${
          order?.ordered_by_last_name || ""
        }`.trim()
      : "") ||
    order?.ordered_by ||
    "\u2014";

  const status = order?.status || "\u2014";
  const priority = order?.priority || "\u2014";

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
      : order?.tests_display || "\u2014";

  const results = Array.isArray(order?.results) ? order.results : [];
  const resultsReady = Boolean(order?.results_ready) || results.length > 0;

  function formatRefRange(lo, hi) {
    const hasLo = lo !== null && lo !== undefined && lo !== "";
    const hasHi = hi !== null && hi !== undefined && hi !== "";
    if (!hasLo && !hasHi) return "\u2014";
    if (hasLo && hasHi) return `${lo} \u2013 ${hi}`;
    if (hasLo) return `\u2265 ${lo}`;
    return `\u2264 ${hi}`;
  }

  function flagMeta(flag) {
    const f = String(flag || "").toUpperCase();
    if (!f) return { label: "\u2014", cls: "bg-slate-50 text-slate-600 ring-slate-200" };
    if (f === "NORMAL") return { label: "Normal", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
    if (f === "LOW") return { label: "Low", cls: "bg-sky-50 text-sky-700 ring-sky-200" };
    if (f === "HIGH") return { label: "High", cls: "bg-amber-50 text-amber-800 ring-amber-200" };
    if (f === "CRIT" || f === "CRITICAL") return { label: "Critical", cls: "bg-rose-50 text-rose-800 ring-rose-200" };
    return { label: flag, cls: "bg-slate-50 text-slate-600 ring-slate-200" };
  }

  return (
    <main className="relative mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-emerald-100 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-sky-100 blur-3xl opacity-60" />

      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700">
            <FlaskConical className="h-3.5 w-3.5" />
            Lab Test Details
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Lab Order #{id}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            A read-only summary of your lab order, including results and attachments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status && status !== "\u2014" && (() => {
            const meta = getLabStatusMeta(status);
            return (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${meta.badgeClass}`}>
                {meta.label}
              </span>
            );
          })()}

          <button
            type="button"
            onClick={() => downloadLabPdf(id)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <DownloadCloud className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Loading lab test...
        </div>
      )}

      {!loading && !error && !order && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Lab order not found.
        </div>
      )}

      {!loading && order && (
        <section className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2">
            <InfoCard
              icon={UserRound}
              label="Patient"
              value={patientName}
            />
            <InfoCard
              icon={Building2}
              label="Facility"
              value={facilityName}
            />
            <InfoCard
              icon={ClipboardList}
              label="Requested By"
              value={orderedBy}
            />
            <InfoCard
              icon={Clock}
              label="Requested At"
              value={formatDateTime(order.ordered_at)}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <InfoCard
              icon={Info}
              label="Priority"
              value={priority}
            />
            <InfoCard
              icon={FlaskConical}
              label="External Lab"
              value={order.external_lab_name || "\u2014"}
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                <FileText className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Tests Requested</h2>
                <p className="text-xs text-slate-500">Ordered tests and notes</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-900">
                {tests}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Note</p>
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
                  {order.note || "No additional note for this lab order."}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                  <FlaskConical className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Results</h2>
                  <p className="text-xs text-slate-500">Reported test outcomes</p>
                </div>
              </div>
              {resultsReady ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Results ready
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  Pending
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {!resultsReady && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  Results are not available yet. Please check back later.
                </div>
              )}

              {resultsReady && results.length === 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  Results are marked as ready, but no result entries were found.
                </div>
              )}

              {results.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <Th>Test</Th>
                        <Th>Result</Th>
                        <Th>Reference</Th>
                        <Th>Flag</Th>
                        <Th>Reported</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {results.map((r) => {
                        const hasNumeric =
                          r?.result_value !== null && r?.result_value !== undefined;
                        const valueText = hasNumeric
                          ? String(r.result_value)
                          : (r?.result_text || "").trim() || "\u2014";

                        const unit = (r?.result_unit || "").trim();
                        const refText = formatRefRange(r?.ref_low, r?.ref_high);
                        const fm = flagMeta(r?.flag);

                        return (
                          <tr key={r.item_id || r.id} className="hover:bg-slate-50">
                            <Td>
                              <div className="font-medium text-slate-900">
                                {r?.test_name || "Lab test"}
                              </div>
                            </Td>
                            <Td>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900">
                                  {valueText}
                                  {unit ? ` ${unit}` : ""}
                                </span>
                                {hasNumeric && (r?.result_text || "").trim() ? (
                                  <span className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                                    {String(r.result_text).trim()}
                                  </span>
                                ) : null}
                              </div>
                            </Td>
                            <Td className="text-xs text-slate-700">{refText}</Td>
                            <Td>
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${fm.cls}`}
                              >
                                {fm.label}
                              </span>
                            </Td>
                            <Td className="text-xs text-slate-700">
                              {formatDateTime(r?.completed_at)}
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50">
                <Paperclip className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Attachments</h2>
                <p className="text-xs text-slate-500">Files shared with this order</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {attachmentsLoading && (
                <p className="text-xs text-slate-500">Loading attachments...</p>
              )}

              {attachmentsError && (
                <p className="text-xs text-red-600">{attachmentsError}</p>
              )}

              {!attachmentsLoading && !attachmentsError && attachments.length === 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  No files attached to this lab test yet.
                </div>
              )}

              {!attachmentsLoading && attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((att) => {
                    const fileUrl = att.url || att.file || att.download_url || "#";

                    const nameFromPath =
                      typeof fileUrl === "string" && fileUrl.includes("/")
                        ? fileUrl.split("/").slice(-1)[0]
                        : null;

                    const label =
                      att.original_name ||
                      att.filename ||
                      att.name ||
                      nameFromPath ||
                      `Attachment #${att.id}`;

                    return (
                      <li
                        key={att.id || `${label}-${fileUrl}`}
                        className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white">
                            <Paperclip className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{label}</span>
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
                        </div>
                        {fileUrl && fileUrl !== "#" && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
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
          </section>

          <div className="flex items-center justify-between">
            <Link
              href="/patient/labs"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Back to lab tests
            </Link>
            <div className="text-xs text-slate-500">
              Requested {formatDate(order?.ordered_at || order?.created_at)}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-4 py-3 align-top text-sm text-slate-800 ${className}`}>
      {children}
    </td>
  );
}
