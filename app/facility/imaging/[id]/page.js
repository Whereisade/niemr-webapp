// app/facility/imaging/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import DownloadReportButton from "@/components/DownloadReportButton";

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
    const numericKeys = Object.keys(body).filter((k) =>
      /^\d+$/.test(k)
    );
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }

  return [];
}

export default function FacilityImagingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");

  // Load imaging request
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadRequest() {
      try {
        setLoading(true);
        setError("");

        // Mirrors lab orders: /imaging/requests/{id}/
        const data = await apiFetch(`/imaging/requests/${id}/`, {
          method: "GET",
        });

        if (cancelled) return;
        setRequest(data);
      } catch (err) {
        console.error("Failed to load imaging request (facility)", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load imaging request details. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRequest();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load attachments for imaging request
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadAttachments() {
      try {
        setAttachmentsLoading(true);
        setAttachmentsError("");

        const qs = new URLSearchParams();
        // Assume attachments are keyed as owner_type=imaging_request
        qs.set("owner_type", "imaging_request");
        qs.set("owner_id", String(id));

        const body = await apiFetch(
          `/attachments/?${qs.toString()}`,
          { method: "GET" }
        );

        if (cancelled) return;

        const items = normalizeAttachmentsPayload(body);
        setAttachments(items);
      } catch (err) {
        console.error("Failed to load imaging attachments (facility)", err);
        if (!cancelled) {
          setAttachmentsError(
            err?.message ||
              "Attachments could not be loaded for this imaging request."
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
          Missing imaging request ID in URL.
        </div>
      </main>
    );
  }

  const patientName =
    request?.patient_name ||
    (request?.patient_first_name || request?.patient_last_name
      ? `${request?.patient_first_name || ""} ${
          request?.patient_last_name || ""
        }`.trim()
      : "") ||
    request?.patient ||
    "—";

  const facilityName =
    request?.facility_name || request?.facility?.name || "—";

  const requestedBy =
    request?.requested_by_name ||
    request?.ordered_by_name ||
    (request?.requested_by_first_name || request?.requested_by_last_name
      ? `${request?.requested_by_first_name || ""} ${
          request?.requested_by_last_name || ""
        }`.trim()
      : "") ||
    request?.requested_by ||
    request?.ordered_by ||
    "—";

  const status = request?.status || "—";
  const priority = request?.priority || "—";

  const modality =
    request?.modality || request?.imaging_type || request?.category || "—";

  const bodyPart =
    request?.body_part || request?.anatomy || request?.region || "—";

  const scheduledFor =
    request?.scheduled_for || request?.scheduled_at || request?.appointment_at;

  const reportText =
    request?.report ||
    request?.report_text ||
    request?.result ||
    request?.impression ||
    "";

  const indication =
    request?.indication || request?.reason || request?.clinical_note || "";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            Imaging request details
          </h1>
          <p className="text-sm text-slate-600">
            Facility view of an imaging request, including patient, modality,
            schedule, report and attachments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status && status !== "—" && (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                status === "REQUESTED"
                  ? "bg-amber-50 text-amber-700"
                  : status === "SCHEDULED"
                  ? "bg-sky-50 text-sky-700"
                  : status === "COMPLETED"
                  ? "bg-emerald-50 text-emerald-700"
                  : status === "CANCELLED"
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-50 text-slate-600"
              }`}
            >
              {status}
            </span>
          )}

          {request && (
            <DownloadReportButton
              type="imaging"
              refId={
                request?.reference ||
                request?.request_number ||
                request?.id
              }
            />
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Loading imaging request…
        </div>
      )}

      {!loading && !error && !request && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Imaging request not found.
        </div>
      )}

      {!loading && request && (
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Top summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Patient
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
                {requestedBy}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Requested at
              </p>
              <p className="text-sm font-medium text-slate-900">
                {formatDateTime(request.requested_at || request.ordered_at)}
              </p>
            </div>
          </div>

          {/* Modality / scheduling */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Modality / procedure
              </p>
              <p className="text-sm text-slate-900">{modality}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Body part / region
              </p>
              <p className="text-sm text-slate-900">{bodyPart}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scheduled for
              </p>
              <p className="text-sm text-slate-900">
                {scheduledFor ? formatDateTime(scheduledFor) : "—"}
              </p>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Priority
            </p>
            <p className="text-sm text-slate-900">{priority}</p>
          </div>

          {/* Indication / reason */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Clinical indication / reason
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
              {indication || "No indication recorded for this request."}
            </div>
          </div>

          {/* Report */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Imaging report
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
              {reportText || "No report recorded yet."}
            </div>
          </div>

          {/* Attachments */}
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
                  No files attached to this imaging request yet.
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
              href="/facility/imaging"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to imaging requests
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
