// components/imaging/ImagingAttachmentsModal.js
"use client";

import { useEffect, useState } from "react";
import {
  listImagingAttachments,
  uploadImagingAttachment,
  deleteImagingAttachment,
} from "@/lib/imagingAttachments";

function resolveDownloadUrl(att) {
  return att.file_url || att.url || att.file || "#";
}

export default function ImagingAttachmentsModal({
  requestId,
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
    if (!open || !requestId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await listImagingAttachments(requestId);

        if (cancelled) return;

        let items = [];
        if (Array.isArray(res?.results)) {
          items = res.results;
        } else if (Array.isArray(res)) {
          items = res;
        } else if (res && typeof res === "object") {
          const numericKeys = Object.keys(res).filter((k) =>
            /^\d+$/.test(k)
          );
          if (numericKeys.length) {
            items = numericKeys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => res[k]);
          }
        }

        setAttachments(items);
      } catch (err) {
        console.error("Failed to load imaging attachments", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load attachments. Please try again."
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
  }, [open, requestId]);

  if (!open) return null;

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      await uploadImagingAttachment(requestId, file, description);

      setFile(null);
      setDescription("");

      const res = await listImagingAttachments(requestId);
      let items = [];
      if (Array.isArray(res?.results)) {
        items = res.results;
      } else if (Array.isArray(res)) {
        items = res;
      } else if (res && typeof res === "object") {
        const numericKeys = Object.keys(res).filter((k) =>
          /^\d+$/.test(k)
        );
        if (numericKeys.length) {
          items = numericKeys
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => res[k]);
        }
      }
      setAttachments(items);
    } catch (err) {
      console.error("Upload imaging attachment failed", err);
      setError(
        err?.message ||
          "Failed to upload attachment. Please try again."
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
      await deleteImagingAttachment(requestId, attId);

      setAttachments((prev) =>
        prev.filter(
          (a) => a.id !== attId && String(a.id) !== String(attId)
        )
      );
    } catch (err) {
      console.error("Delete imaging attachment failed", err);
      alert(
        err?.message ||
          "Failed to delete attachment. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40">
      <div className="mx-4 w-full max-w-xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Imaging attachments
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <p className="text-sm text-slate-500">
              Loading attachments…
            </p>
          )}

          {!loading && !attachments.length && !error && (
            <p className="text-sm text-slate-500">
              No attachments yet for this imaging request.
            </p>
          )}

          {!loading && attachments.length > 0 && (
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {att.filename ||
                        att.name ||
                        att.original_name ||
                        "Attachment"}
                    </p>
                    {att.description && (
                      <p className="text-xs text-slate-600">
                        {att.description}
                      </p>
                    )}
                    {att.uploaded_at && (
                      <p className="text-[11px] text-slate-500">
                        Uploaded{" "}
                        {new Date(
                          att.uploaded_at
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={resolveDownloadUrl(att)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Download
                    </a>
                    {canUpload && (
                      <button
                        type="button"
                        onClick={() => handleDelete(att.id)}
                        disabled={deletingId === att.id}
                        className="rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === att.id
                          ? "Deleting…"
                          : "Delete"}
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
              className="mt-4 space-y-3 border-t border-slate-200 pt-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Add new attachment
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                  }}
                  className="block w-full text-xs text-slate-700 file:mr-2 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="E.g. external report, scan, consent form…"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Upload attachment"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
