// app/facility/labs/[id]/page.js
"use client";

import { useEffect, useState, useMemo } from "react";
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
  Upload,
  X,
  Droplet,
  TestTube,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { submitLabResult, markLabOrderCollected } from "@/lib/labsStatusActions";
import { uploadLabOrderAttachment } from "@/lib/labAttachments";
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

export default function FacilityLabOrderDetailPage() {
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
  
  // File attachment state for result entry
  const [resultFiles, setResultFiles] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  // Sample collection state
  const [collectingItems, setCollectingItems] = useState(new Set());
  const [collectingAll, setCollectingAll] = useState(false);

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
  const isSuperAdmin = meRole === "SUPER_ADMIN";
  const canCollect = ["LAB", "ADMIN"].includes(meRole);
  const canEnterResults = ["LAB", "ADMIN"].includes(meRole);

  // Load lab order
  async function loadOrder() {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch(`/labs/orders/${id}/`, { method: "GET" });
      setOrder(data);

      // Initialize result forms for items without results
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
  async function loadAttachments() {
    if (!id) return;
    try {
      setAttachmentsLoading(true);
      setAttachmentsError("");
      const qs = new URLSearchParams();
      qs.set("owner_type", "lab_order");
      qs.set("owner_id", String(id));
      const body = await apiFetch(`/attachments/?${qs.toString()}`, { method: "GET" });
      setAttachments(normalizeAttachmentsPayload(body));
    } catch (err) {
      setAttachmentsError(err?.message || "Attachments could not be loaded.");
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Handle file selection for a specific item
  function handleFileChange(itemId, file) {
    setResultFiles((prev) => ({
      ...prev,
      [itemId]: file,
    }));
  }

  // Remove selected file for a specific item
  function handleRemoveFile(itemId) {
    setResultFiles((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  }

  // Collect sample for a single item
  async function handleCollectSample(itemId) {
    if (!id || !itemId) return;
    
    setCollectingItems((prev) => new Set(prev).add(itemId));
    setResultError("");
    
    try {
      await markLabOrderCollected(id, [itemId]);
      setResultSuccess(`Sample collected for test item #${itemId}`);
      await loadOrder();
    } catch (err) {
      setResultError(err?.message || "Failed to mark sample collected.");
    } finally {
      setCollectingItems((prev) => {
        const updated = new Set(prev);
        updated.delete(itemId);
        return updated;
      });
    }
  }

  // Collect all samples at once
  async function handleCollectAllSamples() {
    if (!id) return;
    setCollectingAll(true);
    setResultError("");
    try {
      await markLabOrderCollected(id);
      setResultSuccess("All samples marked as collected.");
      await loadOrder();
    } catch (err) {
      setResultError(err?.message || "Failed to mark samples collected.");
    } finally {
      setCollectingAll(false);
    }
  }

  // Submit result for a single item (including optional file attachment)
  async function handleSubmitResult(itemId) {
    if (!id || !itemId) return;

    const form = resultForms[itemId];
    if (!form) return;

    const file = resultFiles[itemId];

    // Validate - need at least result_value, result_text, OR a file attachment
    if (!form.result_value && !form.result_text?.trim() && !file) {
      setResultError("Please enter a result value/text OR attach a result document.");
      return;
    }

    setResultError("");
    setResultSuccess("");
    setSubmittingItemId(itemId);

    try {
      // Submit the result data (can be empty if only file is provided)
      const payload = {
        item_id: itemId,
        result_value: form.result_value || null,
        result_text: form.result_text || "",
        ref_low: form.ref_low || null,
        ref_high: form.ref_high || null,
      };

      await submitLabResult(id, payload);

      // Upload file attachment if one was selected
      if (file) {
        try {
          setUploadingFiles((prev) => ({ ...prev, [itemId]: true }));
          
          const item = order?.items?.find(i => i.id === itemId);
          const testName = item?.display_name || item?.test?.name || item?.requested_name || `Test item #${itemId}`;
          const description = form.result_value || form.result_text 
            ? `Supporting document for ${testName}`
            : `Lab result for ${testName}`;

          await uploadLabOrderAttachment(id, file, description);
          
          handleRemoveFile(itemId);
          await loadAttachments();
        } catch (fileErr) {
          console.error("File upload failed:", fileErr);
          setResultError(`Result saved, but file upload failed: ${fileErr?.message || "Unknown error"}`);
        } finally {
          setUploadingFiles((prev) => ({ ...prev, [itemId]: false }));
        }
      }

      const successMsg = file 
        ? `Result recorded with attached document`
        : `Result saved for test item #${itemId}`;
      setResultSuccess(successMsg);

      await loadOrder();
    } catch (err) {
      setResultError(err?.message || "Failed to submit result.");
    } finally {
      setSubmittingItemId(null);
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

  const patientName =
    order?.patient_name ||
    (order?.patient_first_name || order?.patient_last_name
      ? `${order?.patient_first_name || ""} ${order?.patient_last_name || ""}`.trim()
      : "") ||
    order?.patient ||
    "—";

  const facilityName =
    [
      order?.facility_name,
      order?.facility?.name,
      order?.facility?.display_name,
      order?.facility_display_name,
    ].find((v) => typeof v === "string" && v.trim()) ||
    (typeof order?.facility === "string" &&
    order.facility.trim() &&
    !/^\d+$/.test(order.facility.trim())
      ? order.facility.trim()
      : null) ||
    "—";
  const orderedBy =
    [
      order?.ordered_by_name,
      order?.ordered_by?.name,
      order?.ordered_by?.full_name,
      order?.ordered_by_display_name,
    ].find((v) => typeof v === "string" && v.trim()) ||
    (order?.ordered_by_first_name || order?.ordered_by_last_name
      ? `${order?.ordered_by_first_name || ""} ${order?.ordered_by_last_name || ""}`.trim()
      : "") ||
    (typeof order?.ordered_by === "string" &&
    order.ordered_by.trim() &&
    !/^\d+$/.test(order.ordered_by.trim())
      ? order.ordered_by.trim()
      : "") ||
    "—";

  const priority = order?.priority || "—";
  const status = order?.status || "—";
  const statusNorm = String(status).toUpperCase();
  const { label: statusLabel, badgeClass: statusBadgeClass } = getLabStatusMeta(status);

  const items = Array.isArray(order?.items) ? order.items : [];
  
  // Categorize items by workflow stage
  const awaitingCollection = items.filter((i) => !i.sample_collected_at && !i.completed_at);
  const awaitingResults = items.filter((i) => i.sample_collected_at && !i.completed_at);
  const completedItems = items.filter((i) => i.completed_at);
  
  const allItemsCompleted = items.length > 0 && items.every((i) => i.completed_at);
  const allSamplesCollected = items.length > 0 && items.every((i) => i.sample_collected_at || i.completed_at);

  return (
    <main className="relative mx-auto max-w-5xl space-y-6 p-4 sm:p-6 md:p-10">
      {/* Soft background accents */}
      <div className="pointer-events-none absolute -top-28 -left-32 h-52 w-52 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-32 h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl" />

      {/* Page header */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
              <FlaskConical className="h-3.5 w-3.5" />
              Lab Order #{id}
            </div>
            <h1 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
              Lab Order Workflow
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Collect samples → Enter results → Complete order
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass}`}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {statusLabel}
          </span>

          <button
            type="button"
            onClick={loadOrder}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
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
          <div className="-mx-5 -mt-5 mb-4 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading lab order…</span>
          </div>
        </div>
      )}

      {!loading && !error && !order && (
        <div className="relative rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Lab order not found.
        </div>
      )}

      {order && (
        <>
          {/* Order summary */}
          <section className="relative space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

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
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Facility</p>
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
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">External lab</p>
                <p className="text-sm text-slate-900">{order.external_lab_name || "—"}</p>
              </div>
            </div>

            {order.note && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Clinical note</p>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
                  {order.note}
                </div>
              </div>
            )}
          </section>

          {!isSuperAdmin && (
            <>
              {/* Workflow progress indicator */}
              <section className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      allSamplesCollected ? "bg-emerald-100" : "bg-blue-100"
                    }`}>
                      <Droplet className={`h-5 w-5 ${
                        allSamplesCollected ? "text-emerald-700" : "text-blue-700"
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Step 1: Sample Collection
                      </p>
                      <p className="text-sm text-slate-900">
                        {allSamplesCollected ? "✅ All samples collected" : `${awaitingCollection.length} awaiting collection`}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 md:flex-1" />

                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      allItemsCompleted ? "bg-emerald-100" : allSamplesCollected ? "bg-amber-100" : "bg-slate-100"
                    }`}>
                      <TestTube className={`h-5 w-5 ${
                        allItemsCompleted ? "text-emerald-700" : allSamplesCollected ? "text-amber-700" : "text-slate-400"
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Step 2: Enter Results
                      </p>
                      <p className="text-sm text-slate-900">
                        {allItemsCompleted 
                          ? "✅ All results recorded" 
                          : awaitingResults.length > 0 
                            ? `${awaitingResults.length} ready for results`
                            : "Awaiting sample collection"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Status messages */}
              {resultError && (
                <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{resultError}</span>
                </div>
              )}

              {resultSuccess && (
                <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{resultSuccess}</span>
                </div>
              )}

              {/* STEP 1: Sample Collection */}
              {awaitingCollection.length > 0 && canCollect && (
                <section className="relative rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                  <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-gradient-to-r from-amber-600 via-orange-500 to-red-500" />

                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-5 w-5 text-amber-700" />
                      <h2 className="text-sm font-semibold text-slate-900">
                        Step 1: Collect Samples ({awaitingCollection.length})
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={handleCollectAllSamples}
                      disabled={collectingAll}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60 sm:w-auto"
                    >
                      {collectingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Collect All Samples
                    </button>
                  </div>

                  <div className="space-y-2">
                    {awaitingCollection.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-amber-200">
                            <TestTube className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {item.display_name || item.test?.name || item.requested_name || "Unknown Test"}
                            </p>
                            {item.test?.code && (
                              <p className="text-xs text-slate-500 font-mono">{item.test.code}</p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCollectSample(item.id)}
                          disabled={collectingItems.has(item.id)}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60 sm:w-auto"
                        >
                          {collectingItems.has(item.id) ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Collecting...
                            </>
                          ) : (
                            <>
                              <Droplet className="h-3.5 w-3.5" />
                              Mark Sample Collected
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-slate-600 italic">
                    💡 Collect samples before entering results. You can collect all at once or individually.
                  </p>
                </section>
              )}

              {/* STEP 2: Enter Results */}
              {awaitingResults.length > 0 && canEnterResults && (
                <section className="relative rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
                  <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-500" />

                  <div className="flex items-center gap-2 mb-4">
                    <TestTube className="h-5 w-5 text-sky-700" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Step 2: Enter Results ({awaitingResults.length})
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {awaitingResults.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-sky-200 bg-sky-50/50 p-4"
                      >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-sky-200">
                          <FlaskConical className="h-4 w-4 text-sky-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {item.display_name || item.test?.name || item.requested_name || "Unknown Test"}
                          </p>
                          {item.test?.code && (
                            <p className="text-xs text-slate-500 font-mono">{item.test.code}</p>
                          )}
                          <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Sample collected {formatDateTime(item.sample_collected_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Result entry options */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-slate-700">
                        Choose one or both methods to record results:
                      </p>

                      {/* Option 1: Manual entry */}
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Option A: Enter Result Values
                        </p>
                        
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Result Text (optional - for qualitative results)
                          </label>
                          <textarea
                            value={resultForms[item.id]?.result_text ?? ""}
                            onChange={(e) => handleFormChange(item.id, "result_text", e.target.value)}
                            placeholder="e.g. Positive, Negative, or descriptive findings..."
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Option 2: File attachment */}
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Option B: Attach Result Document
                        </p>
                        
                        {resultFiles[item.id] ? (
                          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <FileText className="h-4 w-4 text-emerald-700 shrink-0" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-emerald-900">
                              {resultFiles[item.id].name}
                            </span>
                            <span className="text-xs text-emerald-700">
                              {(resultFiles[item.id].size / 1024).toFixed(1)} KB
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(item.id)}
                              className="inline-flex items-center justify-center rounded-full p-1 text-emerald-600 hover:bg-emerald-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600 transition hover:border-sky-400 hover:bg-sky-50">
                            <Upload className="h-5 w-5 text-slate-400" />
                            <div className="flex-1">
                              <span className="font-medium text-slate-900">
                                Upload lab report or result document
                              </span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                PDF, image, or scanned document (max 20MB)
                              </p>
                            </div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.bmp,.gif"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileChange(item.id, file);
                                }
                              }}
                              className="sr-only"
                            />
                          </label>
                        )}
                        
                        <p className="text-[10px] text-slate-500 italic">
                          💡 If you're using an external lab, you can just upload their report without entering values manually.
                        </p>
                      </div>

                      {/* Save button */}
                      <button
                        type="button"
                        onClick={() => handleSubmitResult(item.id)}
                        disabled={submittingItemId === item.id || uploadingFiles[item.id]}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                      >
                        {(submittingItemId === item.id || uploadingFiles[item.id]) ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {uploadingFiles[item.id] ? "Uploading document..." : "Saving result..."}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Record Result
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
                </section>
              )}
            </>
          )}

          {/* Completed items */}
          {completedItems.length > 0 && (
            <section className="relative rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-gradient-to-r from-emerald-600 via-green-500 to-lime-500" />

              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Completed Results ({completedItems.length})
                </h2>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="hidden w-full text-left text-sm lg:table">
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
                              : item.result_text || "See attached document"}
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

                <div className="divide-y divide-slate-100 lg:hidden">
                  {completedItems.map((item) => (
                    <div key={item.id} className="space-y-2 p-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.display_name || item.test?.name || item.requested_name || "-"}
                        </p>
                        {item.test?.code && (
                          <p className="text-xs text-slate-500 font-mono">{item.test.code}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Result</p>
                          <p className="font-medium text-slate-900">
                            {item.result_value != null
                              ? `${item.result_value} ${item.result_unit || ""}`
                              : item.result_text || "See attached document"}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">Reference</p>
                          <p className="text-slate-700">
                            {item.ref_low != null && item.ref_high != null
                              ? `${item.ref_low} - ${item.ref_high}`
                              : "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">Flag</p>
                          {item.flag ? (
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${flagBadgeClass(item.flag)}`}>
                              {item.flag}
                            </span>
                          ) : (
                            <p className="text-slate-700">-</p>
                          )}
                        </div>

                        <div>
                          <p className="text-slate-500">Completed</p>
                          <p className="text-slate-700">{formatDateTime(item.completed_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Attachments section */}
          <section className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">All Attachments</h2>
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
                      className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
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
                          className="inline-flex items-center gap-1 self-start rounded-full bg-white px-3 py-1 text-[11px] font-medium text-blue-600 shadow-sm hover:bg-blue-50 sm:self-auto"
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
          <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <Link href="/facility/labs" className="text-slate-600 hover:text-slate-900">
              Back to lab orders
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
