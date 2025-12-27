// app/provider/labs/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
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
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  submitLabResult,
  markLabOrderCollected,
} from "@/lib/labsStatusActions";
import DownloadReportButton from "@/components/DownloadReportButton";
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

function normalizeAttachmentsPayload(body) {
  if (!body) return [];
  if (Array.isArray(body.results)) return body.results;
  if (Array.isArray(body)) return body;
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

function flagBadgeClass(flag) {
  const f = String(flag || "").toUpperCase();
  if (f === "CRIT") return "bg-rose-100 text-rose-800 border-rose-200";
  if (f === "HIGH") return "bg-amber-100 text-amber-800 border-amber-200";
  if (f === "LOW") return "bg-sky-100 text-sky-800 border-sky-200";
  if (f === "NORMAL")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function ProviderLabOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");

  // Current user for role-based UI
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  // Result entry state
  const [resultForms, setResultForms] = useState({});
  const [submittingItemId, setSubmittingItemId] = useState(null);
  const [resultError, setResultError] = useState("");
  const [resultSuccess, setResultSuccess] = useState("");

  // Collect samples state
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await fetch("/api/proxy/accounts/me/", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to load user");
        const json = await res.json();
        if (!cancelled) setMe(json);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const meRole = (me?.role || "").toUpperCase();
  const canEnterResults = ["LAB", "ADMIN", "SUPER_ADMIN"].includes(meRole);
  const canCollect = ["LAB", "ADMIN", "SUPER_ADMIN"].includes(meRole);

  async function loadOrder() {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch(`/labs/orders/${id}/`, { method: "GET" });
      setOrder(data);

      const forms = {};
      (data?.items || []).forEach((item) => {
        forms[item.id] = {
          result_value: item.result_value ?? "",
          result_text: item.result_text ?? "",
          ref_low: item.ref_low ?? item.test?.ref_low ?? "",
          ref_high: item.ref_high ?? item.test?.ref_high ?? "",
        };
      });
      setResultForms(forms);
    } catch (err) {
      setError(err?.message || "Failed to load lab order details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        setAttachments(normalizeAttachmentsPayload(body));
      } catch (err) {
        if (!cancelled) {
          setAttachmentsError(
            err?.message || "Attachments could not be loaded."
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

  function handleFormChange(itemId, field, value) {
    setResultForms((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  }

  async function handleSubmitResult(itemId) {
    if (!id || !itemId) return;
    const form = resultForms[itemId];
    if (!form) return;

    if (!form.result_value && !form.result_text?.trim()) {
      setResultError("Please enter a result value or text for this test.");
      return;
    }

    setResultError("");
    setResultSuccess("");
    setSubmittingItemId(itemId);

    try {
      const payload = {
        item_id: itemId,
        result_value: form.result_value || null,
        result_text: form.result_text || "",
        ref_low: form.ref_low || null,
        ref_high: form.ref_high || null,
      };
      await submitLabResult(id, payload);
      setResultSuccess(`Result saved for item #${itemId}`);
      await loadOrder();
    } catch (err) {
      setResultError(err?.message || "Failed to submit result.");
    } finally {
      setSubmittingItemId(null);
    }
  }

  async function handleCollect() {
    if (!id) return;
    setCollecting(true);
    setResultError("");
    setResultSuccess("");
    try {
      await markLabOrderCollected(id);
      setResultSuccess("Sample marked as collected.");
      await loadOrder();
    } catch (err) {
      setResultError(err?.message || "Failed to mark sample collected.");
    } finally {
      setCollecting(false);
    }
  }

  const statusMeta = getLabStatusMeta(order?.status);
  const status = String(order?.status || "").toUpperCase();
  const canEditResults = canEnterResults && ["PENDING", "IN_PROGRESS"].includes(status);

  const items = Array.isArray(order?.items) ? order.items : [];

  const hasResults = useMemo(() => {
    return items.some((it) => (it.result_value ?? "") !== "" || (it.result_text || "").trim());
  }, [items]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
            <FlaskConical className="h-3.5 w-3.5" />
            Provider · Lab Order
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Lab Order #{id}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {order?.outsourced_to_name
              ? `Outsourced to: ${order.outsourced_to_name}`
              : "Review tests, attachments, and results."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/provider/labs")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={loadOrder}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <DownloadReportButton
            reportType="LAB"
            refId={id}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          />
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading lab order…
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      ) : (
        <>
          {/* Overview */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`h-1.5 w-full bg-gradient-to-r ${statusMeta?.accent || "from-slate-500 to-slate-700"}`} />
            <div className="grid gap-4 p-6 md:grid-cols-3">
              <InfoCard icon={User} title="Patient" value={order?.patient_name || String(order?.patient || "—")} />
              <InfoCard icon={Building2} title="Facility" value={order?.facility_name || (order?.facility ? String(order.facility) : "—")} />
              <InfoCard icon={Clock} title="Ordered" value={formatDateTime(order?.ordered_at || order?.created_at)} />
              <InfoCard icon={Stethoscope} title="Ordered by" value={order?.ordered_by_name || "—"} />
              <InfoCard icon={FileText} title="Status" value={statusMeta?.label || order?.status || "—"} />
              <InfoCard icon={Paperclip} title="Attachments" value={String(attachments.length)} />
            </div>
            {order?.notes ? (
              <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-700">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </div>
                <div className="mt-1 whitespace-pre-wrap">{order.notes}</div>
              </div>
            ) : null}
          </section>

          {/* Actions */}
          {canCollect && status === "PENDING" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50">
                    <CheckCircle2 className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Sample collection</div>
                    <div className="text-sm text-slate-600">
                      Mark the sample as collected to move the order to in progress.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={collecting}
                  onClick={handleCollect}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {collecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Mark collected
                </button>
              </div>
            </div>
          ) : null}

          {/* Results */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
            <div className="p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Results</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {canEditResults
                      ? "Enter results per test item. Save each item individually."
                      : hasResults
                        ? "Results (read-only)."
                        : "No results yet."}
                  </p>
                </div>
                {!meLoading && meRole === "LAB" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Lab workspace
                  </span>
                ) : null}
              </div>

              {(resultError || resultSuccess) && (
                <div className="mt-4">
                  {resultError ? (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <div>{resultError}</div>
                    </div>
                  ) : null}
                  {resultSuccess ? (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4" />
                      <div>{resultSuccess}</div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-6 space-y-4">
                {items.length ? (
                  items.map((item) => {
                    const form = resultForms[item.id] || {};
                    const flag = item.flag || item.result_flag || "";
                    const showInputs = canEditResults;
                    const isSubmitting = submittingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {item.test?.name || item.test_name || "Test"}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              Code: {item.test?.code || item.test_code || "—"}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${flagBadgeClass(flag)}`}
                            >
                              {flag ? `Flag: ${flag}` : "Flag: —"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <Field
                            label="Ref low"
                            value={showInputs ? form.ref_low : (item.ref_low ?? item.test?.ref_low ?? "")}
                            onChange={(v) => handleFormChange(item.id, "ref_low", v)}
                            disabled={!showInputs}
                          />
                          <Field
                            label="Ref high"
                            value={showInputs ? form.ref_high : (item.ref_high ?? item.test?.ref_high ?? "")}
                            onChange={(v) => handleFormChange(item.id, "ref_high", v)}
                            disabled={!showInputs}
                          />
                          <Field
                            label="Result value"
                            value={showInputs ? form.result_value : (item.result_value ?? "")}
                            onChange={(v) => handleFormChange(item.id, "result_value", v)}
                            disabled={!showInputs}
                            placeholder="e.g. 4.5"
                          />
                          <div className="md:col-span-4">
                            <TextArea
                              label="Result text"
                              value={showInputs ? form.result_text : (item.result_text ?? "")}
                              onChange={(v) => handleFormChange(item.id, "result_text", v)}
                              disabled={!showInputs}
                              placeholder="Optional notes / interpretation…"
                            />
                          </div>
                        </div>

                        {showInputs ? (
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleSubmitResult(item.id)}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                            >
                              {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Save result
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-600">No tests found for this order.</div>
                )}
              </div>
            </div>
          </section>

          {/* Attachments */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700" />
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-900">Attachments</h2>
              <p className="mt-1 text-sm text-slate-600">
                Files uploaded for this lab order.
              </p>

              {attachmentsLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading attachments…
                </div>
              ) : attachmentsError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {attachmentsError}
                </div>
              ) : attachments.length ? (
                <ul className="mt-4 space-y-2">
                  {attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {a.title || a.filename || `Attachment #${a.id}`}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDateTime(a.created_at)}
                          </div>
                        </div>
                        {a.file ? (
                          <a
                            href={a.file}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </a>
                        ) : null}
                      </div>
                      {a.description ? (
                        <div className="text-xs text-slate-600">{a.description}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 text-sm text-slate-600">No attachments.</div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function InfoCard({ icon: Icon, title, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-slate-900">
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, placeholder }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, disabled, placeholder }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </label>
  );
}
