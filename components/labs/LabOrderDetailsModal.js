// components/labs/LabOrderDetailsModal.js
"use client";

import { useEffect, useState } from "react";
import { fetchLabOrderById } from "@/lib/labsDetails";
import { listLabOrderAttachments } from "@/lib/labAttachments";
import {
  Beaker,
  X,
  AlertTriangle,
  Loader2,
  UserRound,
  Activity,
  Clock,
  FileText,
  Paperclip,
  Eye,
  Download,
  Image as ImageIcon,
  FileImage,
} from "lucide-react";
import { getLabStatusMeta } from "@/lib/LabsUiConfig";

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

function priorityPillClasses(priority) {
  const p = String(priority || "").toUpperCase();
  const map = {
    STAT: "bg-rose-50 text-rose-700 ring-rose-200",
    URGENT: "bg-amber-50 text-amber-700 ring-amber-200",
    ROUTINE: "bg-slate-50 text-slate-700 ring-slate-200",
  };
  return map[p] || "bg-slate-50 text-slate-700 ring-slate-200";
}

function normalizeAttachmentsResponse(res) {
  if (!res) return [];
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res)) return res;

  if (res && typeof res === "object") {
    const numericKeys = Object.keys(res).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => res[k]);
    }
  }
  return [];
}

function resolveFileUrl(att) {
  return att.file_url || att.url || att.file || "#";
}

function getFileExtension(filename) {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function isImageFile(filename) {
  const ext = getFileExtension(filename);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
}

function isPdfFile(filename) {
  const ext = getFileExtension(filename);
  return ext === "pdf";
}

function ResultItemCard({ item }) {
  const hasValue = item.result_value != null;
  const hasText = item.result_text && item.result_text.trim();
  const hasResult = hasValue || hasText;

  const flagBadgeClass = (flag) => {
    const f = String(flag || "").toUpperCase();
    if (f === "CRIT") return "bg-rose-100 text-rose-800 border-rose-200";
    if (f === "HIGH") return "bg-amber-100 text-amber-800 border-amber-200";
    if (f === "LOW") return "bg-sky-100 text-sky-800 border-sky-200";
    if (f === "NORMAL") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">
            {item.display_name || item.test?.name || item.requested_name || "Unknown Test"}
          </p>
          {item.test?.code && (
            <p className="text-xs text-slate-500 font-mono">{item.test.code}</p>
          )}
        </div>

        {item.completed_at && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <Activity className="h-3 w-3" />
            Completed
          </span>
        )}
      </div>

      {hasResult && (
        <div className="mt-2 space-y-1">
          {hasValue && (
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500">Result:</span>
              <span className="text-sm font-semibold text-slate-900">
                {item.result_value} {item.result_unit || ""}
              </span>
              {item.flag && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${flagBadgeClass(
                    item.flag
                  )}`}
                >
                  {item.flag}
                </span>
              )}
            </div>
          )}

          {hasText && (
            <div className="mt-1">
              <span className="text-xs text-slate-500">Notes:</span>
              <p className="mt-0.5 text-xs text-slate-700 whitespace-pre-wrap">
                {item.result_text}
              </p>
            </div>
          )}

          {(item.ref_low != null || item.ref_high != null) && (
            <div className="text-xs text-slate-500">
              Reference range: {item.ref_low ?? "—"} – {item.ref_high ?? "—"}
            </div>
          )}

          {item.completed_at && (
            <div className="text-[11px] text-slate-500">
              Completed: {formatDateTime(item.completed_at)}
            </div>
          )}
        </div>
      )}

      {!hasResult && item.sample_collected_at && (
        <p className="mt-1 text-xs text-amber-600">
          Sample collected, awaiting results
        </p>
      )}

      {!hasResult && !item.sample_collected_at && (
        <p className="mt-1 text-xs text-slate-500">Pending sample collection</p>
      )}
    </div>
  );
}

function AttachmentPreviewModal({ attachment, onClose }) {
  const fileUrl = resolveFileUrl(attachment);
  const filename = attachment.filename || attachment.name || attachment.original_name || "Document";
  const isImage = isImageFile(filename);
  const isPdf = isPdfFile(filename);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-slate-600" />
            ) : (
              <FileText className="h-5 w-5 text-slate-600" />
            )}
            <div>
              <p className="text-sm font-medium text-slate-900">{filename}</p>
              {attachment.description && (
                <p className="text-xs text-slate-500">{attachment.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto bg-slate-50" style={{ maxHeight: "calc(90vh - 60px)" }}>
          {isImage && (
            <div className="flex items-center justify-center p-4">
              <img
                src={fileUrl}
                alt={filename}
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          )}

          {isPdf && (
            <iframe
              src={fileUrl}
              title={filename}
              className="w-full h-full min-h-[600px]"
            />
          )}

          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="h-16 w-16 text-slate-400 mb-4" />
              <p className="text-sm font-medium text-slate-700 mb-2">
                Preview not available for this file type
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Click download to view this file
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LabOrderDetailsModal({ orderId, onClose, open }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  useEffect(() => {
    if (!open || !orderId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchLabOrderById(orderId);
        if (cancelled) return;
        setOrder(res);
      } catch (err) {
        console.error("Failed to load lab order details", err);
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

    load();

    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  // Load attachments
  useEffect(() => {
    if (!open || !orderId) return;

    let cancelled = false;

    async function loadAttachments() {
      try {
        setAttachmentsLoading(true);
        const res = await listLabOrderAttachments(orderId);
        if (cancelled) return;
        setAttachments(normalizeAttachmentsResponse(res));
      } catch (err) {
        console.error("Failed to load attachments", err);
        if (!cancelled) {
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
  }, [open, orderId]);

  if (!open) return null;

  const testsDisplay = order
    ? Array.isArray(order.items)
      ? order.items
          .map(
            (i) =>
              i.test?.name ||
              i.test?.code ||
              i.test_name ||
              i.code
          )
          .join(", ")
      : order.tests_display || "—"
    : "—";

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const priorityLabel = order?.priority || "—";
  const { label: statusLabel, badgeClass } = getLabStatusMeta(order?.status);

  const items = Array.isArray(order?.items) ? order.items : [];
  const completedItems = items.filter((i) => i.completed_at);
  const pendingItems = items.filter((i) => !i.completed_at);

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/20">
          {/* Header */}
          <div className="relative border-b border-slate-200/80">
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
                  <Beaker className="h-4 w-4 text-slate-700" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Lab order details
                  </h2>
                  {order?.id && (
                    <p className="text-xs text-slate-500">
                      Order ID: <span className="font-mono">{order.id}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Close
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
            {loading && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                Loading lab order…
              </div>
            )}

            {error && (
              <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {order && !loading && !error && (
              <>
                {/* Summary grid */}
                <section className="grid gap-3 md:grid-cols-2">
                  {/* Patient */}
                  <SummaryCard
                    label="Patient"
                    icon={UserRound}
                    value={order.patient_name || order.patient || "—"}
                  />

                  {/* Status */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 place-items-center rounded-md bg-white border border-slate-200">
                          <Activity className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${badgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="grid h-7 w-7 place-items-center rounded-md bg-white border border-slate-200">
                          <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Priority
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${priorityPillClasses(
                          order.priority
                        )}`}
                      >
                        {priorityLabel}
                      </span>
                    </div>
                  </div>

                  {/* Ordered at */}
                  <SummaryCard
                    label="Ordered at"
                    icon={Clock}
                    value={
                      formatDateTime(order.ordered_at || order.created_at) || "—"
                    }
                  />
                </section>

                {/* Tests */}
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-50 border border-slate-200">
                      <Beaker className="h-3.5 w-3.5 text-slate-600" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tests ordered ({items.length})
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {completedItems.length} completed, {pendingItems.length} pending
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <ResultItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>

                {/* Clinical note */}
                {order.note && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-50 border border-slate-200">
                        <FileText className="h-3.5 w-3.5 text-slate-600" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Clinical note
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Shared with the lab team to provide context.
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="whitespace-pre-wrap text-sm text-slate-800">
                        {order.note}
                      </p>
                    </div>
                  </section>
                )}

                {/* Attachments */}
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-50 border border-slate-200">
                      <Paperclip className="h-3.5 w-3.5 text-slate-600" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Attached documents ({attachments.length})
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Lab reports, images, and supporting files
                      </p>
                    </div>
                  </div>

                  {attachmentsLoading && (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                      Loading attachments…
                    </div>
                  )}

                  {!attachmentsLoading && attachments.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
                      No attachments yet for this lab order.
                    </div>
                  )}

                  {!attachmentsLoading && attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((att) => {
                        const fileUrl = resolveFileUrl(att);
                        const filename = att.filename || att.name || att.original_name || "Document";
                        const isImage = isImageFile(filename);
                        const isPdf = isPdfFile(filename);
                        const canPreview = isImage || isPdf;

                        return (
                          <div
                            key={att.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 border border-slate-200">
                                {isImage ? (
                                  <FileImage className="h-4 w-4 text-sky-600" />
                                ) : (
                                  <FileText className="h-4 w-4 text-slate-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {filename}
                                </p>
                                {att.description && (
                                  <p className="truncate text-xs text-slate-500">
                                    {att.description}
                                  </p>
                                )}
                                {att.uploaded_at && (
                                  <p className="text-[11px] text-slate-500">
                                    {formatDateTime(att.uploaded_at)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {canPreview && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </button>
                              )}
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Attachment preview modal */}
      {previewAttachment && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </>
  );
}

/* ─────────────── UI helpers ─────────────── */

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-white border border-slate-200">
          <Icon className="h-3.5 w-3.5 text-slate-500" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-0.5 text-xs text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}