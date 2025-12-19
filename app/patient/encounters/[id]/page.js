// app/patient/encounters/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { listEncounterAmendments } from "@/lib/encounterActions";
import {
  FileText,
  Calendar,
  Stethoscope,
  Building2,
  Pill,
  FlaskConical,
  Activity,
  AlertCircle,
} from "lucide-react";

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

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  } catch {
    return String(value);
  }
}

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  if (typeof data === "object") {
    const keys = Object.keys(data).filter((k) => /^\d+$/.test(k));
    if (keys.length) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => data[k]);
    }
  }
  return [];
}

function SoapSectionPatientView({ label, original, amendments = [] }) {
  // Get latest version (original or last amendment)
  const latestContent = useMemo(() => {
    if (!amendments?.length) return original || "";
    const sorted = [...amendments].sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta; // newest first
    });
    return sorted[0]?.content || original || "";
  }, [original, amendments]);

  const hasCorrections = amendments?.length > 0;

  if (!latestContent && !hasCorrections) return null;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {hasCorrections && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            <AlertCircle className="h-3 w-3" />
            Updated
          </span>
        )}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
        {latestContent || "—"}
      </div>
    </div>
  );
}

export default function PatientEncounterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [encounter, setEncounter] = useState(null);
  const [amendments, setAmendments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);

  const [labOrders, setLabOrders] = useState([]);
  const [labOrdersLoading, setLabOrdersLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadAll() {
      try {
        setLoading(true);
        setError("");

        // Load encounter
        const enc = await apiFetch(`/encounters/${id}/`, { method: "GET" });
        if (cancelled) return;
        setEncounter(enc);

        // Load amendments (corrections) if locked
        if (enc?.locked || enc?.locked_at) {
          try {
            const amends = await listEncounterAmendments(id);
            if (!cancelled) setAmendments(normalizeList(amends));
          } catch (err) {
            console.warn("Failed to load amendments", err);
          }
        }

        // Load attachments
        try {
          setAttachmentsLoading(true);
          const qs = new URLSearchParams();
          qs.set("owner_type", "encounter");
          qs.set("owner_id", String(id));
          const attBody = await apiFetch(`/attachments/?${qs.toString()}`);
          if (!cancelled) setAttachments(normalizeList(attBody));
        } catch (err) {
          console.warn("Failed to load attachments", err);
        } finally {
          if (!cancelled) setAttachmentsLoading(false);
        }

        // Load prescriptions for this encounter
        if (enc?.prescription_ids?.length) {
          try {
            setPrescriptionsLoading(true);
            const rxRes = await apiFetch(
              `/pharmacy/prescriptions/?encounter=${id}`
            );
            if (!cancelled) setPrescriptions(normalizeList(rxRes));
          } catch (err) {
            console.warn("Failed to load prescriptions", err);
          } finally {
            if (!cancelled) setPrescriptionsLoading(false);
          }
        }

        // Load lab orders for this encounter
        if (enc?.lab_order_ids?.length) {
          try {
            setLabOrdersLoading(true);
            const labRes = await apiFetch(`/labs/orders/?encounter=${id}`);
            if (!cancelled) setLabOrders(normalizeList(labRes));
          } catch (err) {
            console.warn("Failed to load lab orders", err);
          } finally {
            if (!cancelled) setLabOrdersLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to load patient encounter", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load encounter. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Group amendments by section
  const amendmentsBySection = useMemo(() => {
    const map = {};
    for (const a of amendments || []) {
      const k = a?.section;
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(a);
    }
    return map;
  }, [amendments]);

  if (!id) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing encounter ID in URL.
        </div>
      </main>
    );
  }

  const providerName =
    encounter?.provider_name ||
    [encounter?.provider_first_name, encounter?.provider_last_name]
      .filter(Boolean)
      .join(" ") ||
    "Provider";

  const facilityName =
    encounter?.facility_name || encounter?.facility?.name || "—";

  const isLocked = Boolean(encounter?.locked || encounter?.locked_at);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            Visit Summary
          </h1>
          <p className="text-sm text-slate-600">
            A read-only summary of your visit with {providerName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {encounter?.status && (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                encounter.status === "OPEN"
                  ? "bg-emerald-50 text-emerald-700"
                  : encounter.status === "CLOSED"
                  ? "bg-slate-100 text-slate-700"
                  : "bg-slate-50 text-slate-600"
              }`}
            >
              {encounter.status}
            </span>
          )}
          {isLocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <AlertCircle className="h-3.5 w-3.5" />
              Updated Record
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Loading your visit summary…
        </div>
      )}

      {!loading && !error && !encounter && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Visit not found.
        </div>
      )}

      {!loading && encounter && (
        <>
          {/* Visit Info Card */}
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Provider
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {providerName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-50">
                  <Building2 className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Facility
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {facilityName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Visit Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDate(encounter.occurred_at || encounter.start_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Visit Type
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {encounter.encounter_type || encounter.type || "Visit"}
                  </p>
                </div>
              </div>
            </div>

            {isLocked && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div className="text-xs text-blue-900">
                    <p className="font-semibold">Updated Medical Record</p>
                    <p className="mt-0.5">
                      This visit summary includes updates made by your provider
                      after the initial note was finalized.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Clinical Summary - Shows latest versions */}
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              What Happened
            </h2>
            <p className="text-xs text-slate-600">
              This section shows your provider's notes about your visit.
            </p>

            <div className="grid gap-3">
              <SoapSectionPatientView
                label="Reason for Visit"
                original={encounter.chief_complaint}
                amendments={amendmentsBySection.CHIEF_COMPLAINT || []}
              />

              <SoapSectionPatientView
                label="Diagnosis"
                original={encounter.diagnoses}
                amendments={amendmentsBySection.DIAGNOSES || []}
              />

              <SoapSectionPatientView
                label="Treatment Plan"
                original={encounter.plan}
                amendments={amendmentsBySection.PLAN || []}
              />

              {/* Show other sections if they exist */}
              {(encounter.hpi || amendmentsBySection.HPI?.length > 0) && (
                <SoapSectionPatientView
                  label="Medical History"
                  original={encounter.hpi}
                  amendments={amendmentsBySection.HPI || []}
                />
              )}

              {(encounter.physical_exam ||
                amendmentsBySection.PHYSICAL_EXAM?.length > 0) && (
                <SoapSectionPatientView
                  label="Examination Findings"
                  original={encounter.physical_exam}
                  amendments={amendmentsBySection.PHYSICAL_EXAM || []}
                />
              )}

              {!encounter.chief_complaint &&
                !encounter.diagnoses &&
                !encounter.plan &&
                !amendments.length && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                    No clinical notes recorded for this visit yet.
                  </div>
                )}
            </div>
          </section>

          {/* Prescriptions */}
          {(prescriptionsLoading || prescriptions.length > 0) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Pill className="h-5 w-5 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Medications Prescribed
                </h2>
              </div>

              {prescriptionsLoading && (
                <p className="text-sm text-slate-500">Loading prescriptions…</p>
              )}

              {!prescriptionsLoading && prescriptions.length === 0 && (
                <p className="text-sm text-slate-500">
                  No medications prescribed during this visit.
                </p>
              )}

              {!prescriptionsLoading && prescriptions.length > 0 && (
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        Prescription #{rx.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {rx.items?.length || 0} medication(s) •{" "}
                        {rx.status || "Pending"}
                      </p>
                      <Link
                        href={`/patient/prescriptions/${rx.id}`}
                        className="mt-2 inline-flex text-xs font-medium text-blue-600 hover:underline"
                      >
                        View details →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Lab Orders */}
          {(labOrdersLoading || labOrders.length > 0) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Lab Tests Ordered
                </h2>
              </div>

              {labOrdersLoading && (
                <p className="text-sm text-slate-500">Loading lab orders…</p>
              )}

              {!labOrdersLoading && labOrders.length === 0 && (
                <p className="text-sm text-slate-500">
                  No lab tests ordered during this visit.
                </p>
              )}

              {!labOrdersLoading && labOrders.length > 0 && (
                <div className="space-y-2">
                  {labOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        Lab Order #{order.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {order.items?.length || 0} test(s) • {order.status || "Pending"}
                      </p>
                      <Link
                        href={`/patient/labs/${order.id}`}
                        className="mt-2 inline-flex text-xs font-medium text-blue-600 hover:underline"
                      >
                        View results →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Attachments */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">
                Attached Files
              </h2>
            </div>

            {attachmentsLoading && (
              <p className="text-sm text-slate-500">Loading files…</p>
            )}

            {!attachmentsLoading && attachments.length === 0 && (
              <p className="text-sm text-slate-500">
                No files attached to this visit.
              </p>
            )}

            {!attachmentsLoading && attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((att) => {
                  const fileUrl = att.file || att.url || att.download_url || "#";
                  const fileName =
                    att.filename ||
                    att.name ||
                    att.original_name ||
                    `File #${att.id}`;

                  return (
                    <li
                      key={att.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {fileName}
                        </span>
                        {att.description && (
                          <span className="mt-0.5 text-xs text-slate-600">
                            {att.description}
                          </span>
                        )}
                      </div>
                      {fileUrl && fileUrl !== "#" && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Open
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <Link
              href="/patient/encounters"
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to my visits
            </Link>
          </div>
        </>
      )}
    </main>
  );
}