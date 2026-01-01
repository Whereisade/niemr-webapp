"use client";

import { useEffect, useState } from "react";
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
import { submitLabResult, markLabOrderCollected } from "@/lib/labsStatusActions";
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
  if (f === "NORMAL") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function IndependentLabOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");

  // Current user
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  // Result entry state
  const [resultForms, setResultForms] = useState({});
  const [submittingItemId, setSubmittingItemId] = useState(null);
  const [resultError, setResultError] = useState("");
  const [resultSuccess, setResultSuccess] = useState("");

  // Collect samples state
  const [collecting, setCollecting] = useState(false);

  // Load current user
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
    return () => { cancelled = true; };
  }, []);

  const meRole = (me?.role || "").toUpperCase();
  const isLabRole = meRole === "LAB";

  // Load lab order
  async function loadOrder() {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch(`/labs/orders/${id}/`, { method: "GET" });
      setOrder(data);

      // Initialize result forms for items
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

  // Load attachments
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
        const body = await apiFetch(`/attachments/?${qs.toString()}`, { method: "GET" });
        if (cancelled) return;
        setAttachments(normalizeAttachmentsPayload(body));
      } catch (err) {
        if (!cancelled) {
          setAttachmentsError(err?.message || "Attachments could not be loaded.");
          setAttachments([]);
        }
      } finally {
        if (!cancelled) setAttachmentsLoading(false);
      }
    }

    loadAttachments();
    return () => { cancelled = true; };
  }, [id]);

  // Handle form changes for a specific item
  function handleFormChange(itemId, field, value) {
    setResultForms((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  }

  // Submit result for a single item
  async function handleSubmitResult(itemId) {
    if (!id || !itemId) return;

    const form = resultForms[itemId];
    if (!form) return;

    // Validate
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
      setResultSuccess(`Result saved for test item #${itemId}`);

      // Reload order
      await loadOrder();
    } catch (err) {
      setResultError(err?.message || "Failed to submit result.");
    } finally {
      setSubmittingItemId(null);
    }
  }

  // Handle collect all samples
  async function handleCollectSamples() {
    if (!id) return;
    setCollecting(true);
    setResultError("");
    try {
      await markLabOrderCollected(id);
      setResultSuccess("Samples marked as collected.");
      await loadOrder();
    } catch (err) {
      setResultError(err?.message || "Failed to mark samples collected.");
    } finally {
      setCollecting(false);
    }
  }

  if (!id) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing lab order ID in URL.
        </div>
      </main>
    );
  }

  if (meLoading) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </main>
    );
  }

  if (!isLabRole) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-lg font-semibold text-amber-900">Access Restricted</h1>
          <p className="mt-2 text-sm text-amber-800">
            This page is for independent lab scientists. Your current role is: <strong>{me?.role || "Unknown"}</strong>
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const patientName =
    order?.patient_name ||
    (order?.patient_first_name || order?.patient_last_name
      ? `${order?.patient_first_name || ""} ${order?.patient_last_name || ""}`.trim()
      : "") ||
    `Patient #${order?.patient}` ||
    "—";

  const facilityName = order?.facility_name || order?.facility?.name || `Facility #${order?.facility}` || "—";
  const orderedBy =
    order?.ordered_by_name ||
    (order?.ordered_by_first_name || order?.ordered_by_last_name
      ? `${order?.ordered_by_first_name || ""} ${order?.ordered_by_last_name || ""}`.trim()
      : "") ||
    `User #${order?.ordered_by}` ||
    "—";

  const priority = order?.priority || "—";
  const status = order?.status || "—";
  const statusNorm = String(status).toUpperCase();
  const { label: statusLabel, badgeClass: statusBadgeClass } = getLabStatusMeta(status);

  const items = Array.isArray(order?.items) ? order.items : [];
  const allItemsCompleted = items.length > 0 && items.every((i) => i.completed_at);
  const pendingItems = items.filter((i) => !i.completed_at);
  const completedItems = items.filter((i) => i.completed_at);

  return (
    <main className="relative mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      {/* Background accents */}
      <div className="pointer-events-none absolute -top-28 -left-32 h-52 w-52 rounded-full bg-teal-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-32 h-56 w-56 rounded-full bg-cyan-100/50 blur-3xl" />

      {/* Header */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Link
            href="/lab/orders"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Orders
          </Link>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-teal-700">
              <FlaskConical className="h-3.5 w-3.5" />
              Lab Order #{id}
            </div>
            <h1 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
              Enter Lab Results
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Process this lab order and enter test results.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass}`}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {statusLabel}
          </span>

          <button
            type="button"
            onClick={loadOrder}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <DownloadReportButton
            type="lab"
            refId={order?.reference || order?.order_number || order?.id}
          />
        </div>
      </div>

      {error && (
        <div className="relative rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !order && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="-mx-5 -mt-5 mb-4 h-1.5 bg-gradient-to-r from-teal-600 via-cyan-500 to-sky-500" />
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading lab order…</span>
          </div>
        </div>
      )}

      {!loading && !error && !order && (
        <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Lab order not found or you don't have access.
        </div>
      )}

      {order && (
        <>
          {/* Order summary */}
          <section className="relative space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-gradient-to-r from-teal-600 via-cyan-500 to-sky-500" />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Patient</p>
                  <p className="text-sm font-medium text-slate-900">{patientName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requesting Facility</p>
                  <p className="text-sm font-medium text-slate-900">{facilityName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                  <Stethoscope className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ordered by</p>
                  <p className="text-sm font-medium text-slate-900">{orderedBy}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ordered at</p>
                <p className="text-sm text-slate-900">{formatDateTime(order.ordered_at || order.created_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Priority</p>
                <p className="text-sm text-slate-900">{priority}</p>
              </div>
            </div>

            {order.note && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Clinical Note</p>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
                  {order.note}
                </div>
              </div>
            )}
          </section>

          {/* Results entry section */}
          <section className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500" />

            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900">Test Results</h2>
              </div>

              <div className="flex items-center gap-2">
                {statusNorm === "PENDING" && (
                  <button
                    type="button"
                    onClick={handleCollectSamples}
                    disabled={collecting}
                    className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    {collecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Mark All Samples Collected
                  </button>
                )}

                {allItemsCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All results completed
                  </span>
                )}
              </div>
            </div>

            {/* Status messages */}
            {resultError && (
              <div className="mb-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{resultError}</span>
              </div>
            )}

            {resultSuccess && (
              <div className="mb-4 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{resultSuccess}</span>
              </div>
            )}

            {/* Pending items - editable */}
            {pendingItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  Pending Results ({pendingItems.length})
                </h3>
                <div className="space-y-3">
                  {pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {item.display_name || item.test?.name || item.requested_name || "Unknown Test"}
                          </p>
                          {item.test?.code && (
                            <p className="text-xs text-slate-500 font-mono">{item.test.code}</p>
                          )}
                        </div>
                        {item.sample_collected_at ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                            <Clock className="h-3 w-3" />
                            Collected {formatDateTime(item.sample_collected_at)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Awaiting collection
                          </span>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Result Value
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={resultForms[item.id]?.result_value ?? ""}
                            onChange={(e) => handleFormChange(item.id, "result_value", e.target.value)}
                            placeholder="e.g. 12.5"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={item.test?.unit || item.result_unit || "—"}
                            disabled
                            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-sm text-slate-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Ref Low
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={resultForms[item.id]?.ref_low ?? ""}
                            onChange={(e) => handleFormChange(item.id, "ref_low", e.target.value)}
                            placeholder={item.test?.ref_low ?? "—"}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Ref High
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={resultForms[item.id]?.ref_high ?? ""}
                            onChange={(e) => handleFormChange(item.id, "ref_high", e.target.value)}
                            placeholder={item.test?.ref_high ?? "—"}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => handleSubmitResult(item.id)}
                            disabled={submittingItemId === item.id}
                            className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {submittingItemId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Save Result
                          </button>
                        </div>
                      </div>

                      {/* Optional text result */}
                      <div className="mt-3">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Result Text (optional - for qualitative results)
                        </label>
                        <textarea
                          value={resultForms[item.id]?.result_text ?? ""}
                          onChange={(e) => handleFormChange(item.id, "result_text", e.target.value)}
                          placeholder="e.g. Positive, Negative, or descriptive findings..."
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed items */}
            {completedItems.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  Completed Results ({completedItems.length})
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Test</th>
                        <th className="px-3 py-2">Result</th>
                        <th className="px-3 py-2">Reference Range</th>
                        <th className="px-3 py-2">Flag</th>
                        <th className="px-3 py-2">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {completedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-900">
                              {item.display_name || item.test?.name || item.requested_name || "—"}
                            </div>
                            {item.test?.code && (
                              <div className="text-xs text-slate-500 font-mono">{item.test.code}</div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-900">
                              {item.result_value != null
                                ? `${item.result_value} ${item.result_unit || ""}`
                                : item.result_text || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.ref_low != null && item.ref_high != null
                              ? `${item.ref_low} – ${item.ref_high}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {item.flag ? (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${flagBadgeClass(item.flag)}`}>
                                {item.flag}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-xs">
                            {formatDateTime(item.completed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500">
                No test items in this order.
              </div>
            )}
          </section>

          {/* Attachments section */}
          <section className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Attachments</h2>
            </div>

            {attachmentsLoading && (
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading attachments…</span>
              </p>
            )}

            {attachmentsError && (
              <p className="text-xs text-red-600">{attachmentsError}</p>
            )}

            {!attachmentsLoading && !attachmentsError && attachments.length === 0 && (
              <p className="text-xs text-slate-500">No files attached to this lab order.</p>
            )}

            {!attachmentsLoading && attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((att) => {
                  const fileUrl = att.file || att.url || att.download_url || "#";
                  const nameFromPath = typeof att.file === "string" ? att.file.split("/").slice(-1)[0] : null;
                  const label = att.filename || att.name || att.original_name || nameFromPath || `Attachment #${att.id}`;

                  return (
                    <li
                      key={att.id || `${label}-${fileUrl}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{label}</span>
                        {att.description && <span className="mt-0.5 text-[11px] text-slate-600">{att.description}</span>}
                        {att.created_at && <span className="mt-0.5 text-[11px] text-slate-500">Uploaded {formatDateTime(att.created_at)}</span>}
                      </div>
                      {fileUrl && fileUrl !== "#" && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-blue-600 shadow-sm hover:bg-blue-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Open
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Footer nav */}
          <div className="flex items-center justify-between text-xs">
            <Link
              href="/lab/orders"
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Orders
            </Link>
          </div>
        </>
      )}
    </main>
  );
}