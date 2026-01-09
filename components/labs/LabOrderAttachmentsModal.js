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
  Eye,
  Image as ImageIcon,
  FileImage,
  Upload,
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

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentPreviewModal({ attachment, onClose }) {
  const fileUrl = resolveDownloadUrl(attachment);
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

  const [previewAttachment, setPreviewAttachment] = useState(null);

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
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl shadow-slate-900/20">
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
                    {attachments.length} {attachments.length === 1 ? "file" : "files"} attached to this order
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
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white border border-slate-200">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <p className="font-medium text-slate-700 mb-1">No attachments yet</p>
                {canUpload ? (
                  <p className="text-xs text-slate-500">
                    Use the form below to upload documents, images, or external reports.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    No files have been attached to this lab order.
                  </p>
                )}
              </div>
            )}

            {!loading && attachments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Attached Files
                  </p>
                  <p className="text-xs text-slate-500">
                    {attachments.length} {attachments.length === 1 ? "file" : "files"}
                  </p>
                </div>

                <div className="space-y-2">
                  {attachments.map((att) => {
                    const fileUrl = resolveDownloadUrl(att);
                    const filename = att.filename || att.name || att.original_name || "Document";
                    const isImage = isImageFile(filename);
                    const isPdf = isPdfFile(filename);
                    const canPreview = isImage || isPdf;

                    return (
                      <div
                        key={att.id}
                        className="group rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start gap-3 p-3">
                          {/* File icon/thumbnail */}
                          <div className="shrink-0">
                            {isImage && fileUrl !== "#" ? (
                              <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                <img
                                  src={fileUrl}
                                  alt={filename}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-50 border border-slate-200">
                                {isImage ? (
                                  <FileImage className="h-5 w-5 text-sky-600" />
                                ) : isPdf ? (
                                  <FileText className="h-5 w-5 text-red-600" />
                                ) : (
                                  <FileText className="h-5 w-5 text-slate-500" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* File details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {filename}
                            </p>
                            {att.description && (
                              <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                                {att.description}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                              {att.uploaded_at && (
                                <span>
                                  {new Date(att.uploaded_at).toLocaleDateString()}
                                </span>
                              )}
                              {att.file_size && (
                                <span>{formatFileSize(att.file_size)}</span>
                              )}
                              {isImage && <span className="text-sky-600 font-medium">Image</span>}
                              {isPdf && <span className="text-red-600 font-medium">PDF</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            {canPreview && (
                              <button
                                type="button"
                                onClick={() => setPreviewAttachment(att)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </a>
                            {canUpload && (
                              <button
                                type="button"
                                onClick={() => handleDelete(att.id)}
                                disabled={deletingId === att.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingId === att.id ? "..." : "Delete"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                  <label className="mb-2 block text-xs font-medium text-slate-700">
                    Choose file
                  </label>
                  {file ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span className="flex-1 truncate text-sm font-medium text-emerald-900">
                        {file.name}
                      </span>
                      <span className="text-xs text-emerald-700">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="inline-flex items-center justify-center rounded-full p-1 text-emerald-600 hover:bg-emerald-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-blue-400 hover:bg-blue-50">
                      <Upload className="h-5 w-5 text-slate-400" />
                      <div className="flex-1">
                        <span className="font-medium text-slate-900">
                          Click to upload file
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          PDF, image, or document (max 20MB)
                        </p>
                      </div>
                      <input
                        type="file"
                        onChange={(e) => {
                          const f = e.target.files && e.target.files[0];
                          setFile(f || null);
                        }}
                        className="sr-only"
                      />
                    </label>
                  )}
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
                    placeholder="E.g. Lab result report, consent form, external analysis…"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploading || !file}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
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