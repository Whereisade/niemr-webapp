"use client";

import { useEffect, useState } from "react";
import {
  listAttachments,
  uploadAttachments,
  deleteAttachment,
} from "@/lib/attachments";

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

function formatBytes(bytes) {
  if (!bytes || typeof bytes !== "number") return "";
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let u = -1;
  let value = bytes;
  do {
    value /= thresh;
    ++u;
  } while (Math.abs(value) >= thresh && u < units.length - 1);
  return `${value.toFixed(1)} ${units[u]}`;
}

/**
 * Generic attachments widget.
 *
 * Props:
 *  - refType: e.g. "ENCOUNTER", "LAB", "IMAGING"
 *  - refId: numeric or string id for the backend record
 *  - canUpload: boolean (true to show upload input)
 *  - className: optional extra classes for wrapper
 *
 * Backend expectations (from /api/attachments/):
 *  Each item should at least have:
 *    - id
 *    - file or url (URL to the file)
 *    - original_name (optional)
 *    - size (optional, in bytes)
 *    - uploaded_at (optional)
 */
export default function AttachmentList({
  refType,
  refId,
  canUpload = false,
  className = "",
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const canLoad = Boolean(refType && refId);

  const load = async () => {
    if (!canLoad) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAttachments({ refType, refId });
      if (Array.isArray(data)) {
        setItems(data);
      } else if (Array.isArray(data.results)) {
        setItems(data.results);
      } else if (Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to load attachments", err);
      setError(err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refType, refId]);

  const handleUploadChange = async (event) => {
    const files = Array.from(event.target.files || []);
    // clear the input so same file can be picked again if needed
    event.target.value = "";

    if (!files.length || !canLoad) return;

    setIsUploading(true);
    try {
      await uploadAttachments({ refType, refId, files });
      await load();
    } catch (err) {
      console.error("Upload failed", err);
      alert(
        err?.message || "Failed to upload attachment(s). Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Remove this attachment? This cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteAttachment(id);
      setItems((prev) => prev.filter((item) => String(item.id) !== String(id)));
    } catch (err) {
      console.error("Delete failed", err);
      alert(
        err?.message || "Failed to delete attachment. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section
      className={
        "rounded-2xl border border-slate-200 bg-white shadow-sm " + className
      }
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Attachments
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Upload and view supporting files for this record.
          </p>
        </div>

        {canUpload && (
          <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100">
            <span className="mr-1.5 text-base" aria-hidden="true">
              📎
            </span>
            <span>{isUploading ? "Uploading…" : "Attach files"}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleUploadChange}
              disabled={isUploading || !canLoad}
            />
          </label>
        )}
      </div>

      {error && (
        <div className="border-b border-slate-100 px-4 py-3 text-xs text-red-600">
          Failed to load attachments.
        </div>
      )}

      {isLoading && !items.length ? (
        <div className="px-4 py-4 text-sm text-slate-500">
          Loading attachments…
        </div>
      ) : null}

      {!isLoading && !items.length ? (
        <div className="px-4 py-4 text-sm text-slate-500">
          No attachments yet.
        </div>
      ) : null}

      {items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.map((att) => {
            const id = att.id;
            const name =
              att.original_name ||
              att.filename ||
              att.name ||
              (att.file && String(att.file).split("/").slice(-1)[0]) ||
              "Attachment";
            const url = att.file || att.url || null;
            const sizeLabel =
              typeof att.size === "number" ? formatBytes(att.size) : "";
            const uploadedAt = att.uploaded_at || att.created_at || null;

            return (
              <li key={id} className="flex items-center px-4 py-3 text-sm">
                <div className="mr-3 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  📄
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-slate-900 truncate">
                      {name}
                    </div>
                    {sizeLabel && (
                      <span className="text-[11px] text-slate-500">
                        · {sizeLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {uploadedAt ? `Uploaded ${formatDateTime(uploadedAt)}` : ""}
                  </div>
                </div>

                <div className="ml-3 flex items-center gap-2">
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open
                    </a>
                  )}

                  {canUpload && (
                    <button
                      type="button"
                      onClick={() => handleDelete(id)}
                      disabled={deletingId === id}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {deletingId === id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
