"use client";

import { useMemo, useState } from "react";
import { Paperclip, Plus, X, Loader2, Edit3, FileText } from "lucide-react";

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
  const [openType, setOpenType] = useState(null); // null | 'correction' | 'addition'
  const [reason, setReason] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Separate amendments by type
  const { corrections, additions } = useMemo(() => {
    const corr = [];
    const add = [];
    
    (amendments || []).forEach((a) => {
      const type = (a.amendment_type || "CORRECTION").toUpperCase();
      if (type === "ADDITION") {
        add.push(a);
      } else {
        corr.push(a);
      }
    });

    return { corrections: corr, additions: add };
  }, [amendments]);

  // Build version history for corrections (with strikethrough)
  const correctionVersions = useMemo(() => {
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

    corrections.forEach((a, idx) => {
      items.push({
        key: `c-${a.id || idx}`,
        title: `Correction ${idx + 1}`,
        by: a.added_by_name || a.added_by || null,
        at: a.created_at,
        reason: a.reason,
        content: cleanText(a.content || ""),
        attachments: Array.isArray(a.attachments) ? a.attachments : [],
      });
    });

    // Only strike through if there are corrections
    // If there are corrections, strike through all except the latest
    const hasCorrections = corrections.length > 0;
    const lastIndex = items.length - 1;
    return items.map((it, i) => ({ 
      ...it, 
      crossed: hasCorrections && i !== lastIndex 
    }));
  }, [original, corrections]);

  // Build addition items (no strikethrough)
  const additionItems = useMemo(() => {
    return additions.map((a, idx) => ({
      key: `a-${a.id || idx}`,
      title: `Addition ${idx + 1}`,
      by: a.added_by_name || a.added_by || null,
      at: a.created_at,
      reason: a.reason,
      content: cleanText(a.content || ""),
      attachments: Array.isArray(a.attachments) ? a.attachments : [],
    }));
  }, [additions]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (disabled || !openType) return;

    const r = reason.trim();
    const c = content.trim();
    if (!r || !c) {
      setError("Reason and content are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onCreate?.({
        section,
        amendment_type: openType.toUpperCase(),
        reason: r,
        content: c,
        files,
      });
      setReason("");
      setContent("");
      setFiles([]);
      setOpenType(null);
    } catch (err) {
      console.error("Create amendment failed", err);
      setError(err?.message || "Failed to add amendment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function closeForm() {
    setOpenType(null);
    setReason("");
    setContent("");
    setFiles([]);
    setError("");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Locked section • corrections replace, additions supplement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenType(openType === "correction" ? null : "correction")}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {openType === "correction" ? (
              <X className="h-4 w-4" />
            ) : (
              <Edit3 className="h-4 w-4" />
            )}
            {openType === "correction" ? "Cancel" : "Add correction"}
          </button>

          <button
            type="button"
            onClick={() => setOpenType(openType === "addition" ? null : "addition")}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {openType === "addition" ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {openType === "addition" ? "Cancel" : "Add addition"}
          </button>
        </div>
      </div>

      {/* Correction Version History */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Edit3 className="h-3.5 w-3.5" />
          Main Content {corrections.length > 0 && `(${corrections.length} correction${corrections.length !== 1 ? 's' : ''})`}
        </div>

        {correctionVersions.map((v) => (
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

      {/* Additions (Supplementary Content) */}
      {additionItems.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <FileText className="h-3.5 w-3.5" />
            Supplementary Information ({additionItems.length} addition{additionItems.length !== 1 ? 's' : ''})
          </div>

          {additionItems.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-emerald-900">{item.title}</span>
                  {item.at ? (
                    <span className="text-emerald-700">{formatDateTime(item.at)}</span>
                  ) : null}
                  {item.by ? (
                    <span className="text-emerald-700">• {item.by}</span>
                  ) : null}
                </div>
                {item.reason ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                    {item.reason}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 whitespace-pre-wrap break-words text-sm text-emerald-900">
                {item.content ? item.content : "—"}
              </div>

              {item.attachments?.length ? (
                <div className="mt-3 border-t border-emerald-200 pt-2">
                  <p className="mb-1 flex items-center gap-2 text-xs font-medium text-emerald-700">
                    <Paperclip className="h-4 w-4 text-emerald-600" />
                    Attachments
                  </p>
                  <div className="flex flex-col gap-1">
                    {item.attachments.map((f) => {
                      const fileUrl = f.file || f.url || f.download_url || "#";
                      const fileName = f.name || f.original_name || f.filename || "file";
                      return (
                        <a
                          key={f.id || fileUrl}
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-900 hover:bg-emerald-50"
                        >
                          <span className="truncate">{fileName}</span>
                          <span className="text-emerald-600">Open</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Amendment Form (Correction or Addition) */}
      {openType && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            {openType === "correction" ? (
              <>
                <Edit3 className="h-4 w-4 text-slate-600" />
                Add Correction
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-emerald-600" />
                Add Supplementary Information
              </>
            )}
          </div>

          {openType === "correction" && (
            <p className="mb-3 text-xs text-slate-600">
              Corrections replace incorrect information. The previous version will be struck through.
            </p>
          )}

          {openType === "addition" && (
            <p className="mb-3 text-xs text-emerald-700">
              Additions supplement the existing note with new information discovered later. No content will be struck through.
            </p>
          )}

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
                placeholder={
                  openType === "correction"
                    ? "e.g., Transcription error, incorrect diagnosis"
                    : "e.g., Additional lab results received, follow-up findings"
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">
                {openType === "correction" ? "Corrected text" : "Additional information"}
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  openType === "correction"
                    ? "Enter the corrected version of this section..."
                    : "Enter supplementary information to add to this section..."
                }
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
                onClick={closeForm}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || disabled}
                className={
                  openType === "correction"
                    ? "inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    : "inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                }
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {openType === "correction" ? "Save correction" : "Save addition"}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}