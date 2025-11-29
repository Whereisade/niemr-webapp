// components/labs/LabOrderAttachmentsModal.js
"use client";

import { useEffect, useState } from "react";
import {
  listLabOrderAttachments,
  uploadLabOrderAttachment,
  deleteLabOrderAttachment,
} from "@/lib/labAttachments";
import {
  Paperclip,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Plus,
  FileText,
} from "lucide-react";

function resolveDownloadUrl(att) {
  return att.file_url || att.url || att.file || "#";
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

export default function LabOrderAttachmentsModal({
  orderId,
  open,
  onClose,
  canUpload = false,
}) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!open || !orderId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await listLabOrderAttachments(orderId);
        if (cancelled) return;
        setAttachments(normalizeAttachmentsResponse(res));
      } catch (err) {
        console.error("Failed to load lab attachments", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load attachments. Please try again."
          );
          setAttachments([]);
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

  if (!open) return null;

  async function refreshList() {
    try {
      const res = await listLabOrderAttachments(orderId);
      setAttachments(normalizeAttachmentsResponse(res));
    } catch (err) {
      console.error("Refresh attachments failed", err);
      setError(
        err?.message || "Failed to refresh attachments. Please try again."
      );
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      await uploadLabOrderAttachment(orderId, file, description);

      // Reset form
      setFile(null);
      setDescription("");

      // Reload list
      await refreshList();
    } catch (err) {
      console.error("Upload attachment failed", err);
      setError(
        err?.message || "Failed to upload attachment. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attId) {
    if (!attId) return;
    const ok = window.confirm(
      "Are you sure you want to delete this attachment?"
    );
    if (!ok) return;

    try {
      setDeletingId(attId);
      await deleteLabOrderAttachment(orderId, attId);
      setAttachments((prev) =>
        prev.filter((a) => a.id !== attId && String(a.id) !== String(attId))
      );
    } catch (err) {
      console.error("Delete attachment failed", err);
      alert(err?.message || "Failed to delete attachment. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-4 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/20">
        {/* Header */}
        <div className="relative border-b border-slate-200/80">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50">
                <Paperclip className="h-4 w-4 text-slate-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Lab order attachments
                </h2>
                <p className="text-xs text-slate-500">
                  Upload and manage supporting files for this lab order.
                </p>
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
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {error && (
            <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              Loading attachments…
            </div>
          )}

          {!loading && !attachments.length && !error && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-white">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              No attachments yet for this lab order.
              {canUpload && (
                <div className="mt-1 text-xs text-slate-400">
                  Use the form below to upload documents, images, or external
                  reports.
                </div>
              )}
            </div>
          )}

          {!loading && attachments.length > 0 && (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex flex-1 gap-2">
                    <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white border border-slate-200">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {att.filename ||
                          att.name ||
                          att.original_name ||
                          "Attachment"}
                      </p>
                      {att.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                          {att.description}
                        </p>
                      )}
                      {att.uploaded_at && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Uploaded{" "}
                          {new Date(att.uploaded_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <a
                      href={resolveDownloadUrl(att)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                    {canUpload && (
                      <button
                        type="button"
                        onClick={() => handleDelete(att.id)}
                        disabled={deletingId === att.id}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === att.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Upload form */}
          {canUpload && (
            <form
              onSubmit={handleUpload}
              className="mt-4 space-y-3 border-t border-slate-200 pt-4"
            >
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-50 border border-blue-100">
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Add new attachment
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Upload PDFs, images, or documents linked to this lab order.
                  </p>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    setFile(f || null);
                  }}
                  className="block w-full text-xs text-slate-700 file:mr-2 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="E.g. consent form, external result, photo…"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Upload attachment
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
