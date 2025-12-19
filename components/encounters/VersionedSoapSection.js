"use client";

import { useMemo, useState } from "react";
import { Paperclip, Plus, X, Loader2 } from "lucide-react";

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

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function VersionedSoapSection({
  label,
  section,
  original,
  amendments = [],
  onCreate,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const versions = useMemo(() => {
    const items = [];
    items.push({
      key: "original",
      title: "Original",
      by: null,
      at: null,
      reason: null,
      content: cleanText(original || ""),
      attachments: [],
    });

    (amendments || []).forEach((a, idx) => {
      items.push({
        key: `a-${a.id || idx}`,
        title: `Correction ${idx + 1}`,
        by: a.added_by_name || a.added_by || null,
        at: a.created_at,
        reason: a.reason,
        content: cleanText(a.content || ""),
        attachments: Array.isArray(a.attachments) ? a.attachments : [],
      });
    });

    // Strike through every version except the latest.
    const lastIndex = items.length - 1;
    return items.map((it, i) => ({ ...it, crossed: i !== lastIndex }));
  }, [original, amendments]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (disabled) return;

    const r = reason.trim();
    const c = content.trim();
    if (!r || !c) {
      setError("Reason and corrected text are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onCreate?.({ section, reason: r, content: c, files });
      setReason("");
      setContent("");
      setFiles([]);
      setOpen(false);
    } catch (err) {
      console.error("Create correction failed", err);
      setError(err?.message || "Failed to add correction. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Locked section • corrections are append-only
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {open ? "Close" : "Add correction"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {versions.map((v) => (
          <div
            key={v.key}
            className="rounded-xl border border-slate-200 bg-slate-50/40 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">{v.title}</span>
                {v.at ? (
                  <span className="text-slate-500">{formatDateTime(v.at)}</span>
                ) : null}
                {v.by ? (
                  <span className="text-slate-500">• {v.by}</span>
                ) : null}
              </div>
              {v.reason ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                  {v.reason}
                </span>
              ) : null}
            </div>

            <div
              className={[
                "mt-2 whitespace-pre-wrap break-words text-sm",
                v.crossed
                  ? "text-slate-400 line-through"
                  : "text-slate-900",
              ].join(" ")}
            >
              {v.content ? v.content : "—"}
            </div>

            {v.attachments?.length ? (
              <div className="mt-3 border-t border-slate-200 pt-2">
                <p className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  Attachments
                </p>
                <div className="flex flex-col gap-1">
                  {v.attachments.map((f) => {
                    const fileUrl = f.file || f.url || f.download_url || "#";
                    const fileName = f.name || f.original_name || f.filename || "file";
                    return (
                      <a
                        key={f.id || fileUrl}
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <span className="truncate">{fileName}</span>
                        <span className="text-slate-400">Open</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-3">
            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}

            <div>
              <label className="text-xs font-medium text-slate-700">
                Reason
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Transcription error"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">
                Corrected text
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">
                Optional attachments
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                <Paperclip className="h-4 w-4 text-slate-400" />
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs"
                />
              </div>
              {files.length ? (
                <p className="mt-1 text-xs text-slate-500">Selected: {files.length}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || disabled}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save correction
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}