"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pill,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

function safeToUpper(v) {
  return String(v || "").toUpperCase();
}

function normaliseList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const numericKeys = Object.keys(payload).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => payload[k]);
    }
  }
  return [];
}

function emptyItem() {
  return {
    use_catalog: true,
    drug_code: "",
    drug_name: "",
    dose: "",
    frequency: "",
    duration_days: "",
    qty_prescribed: "",
    instruction: "",
  };
}

export default function PrescriptionCreateForm({
  title,
  subtitle,
  backHref,
  redirectTo,
}) {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [patientId, setPatientId] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [note, setNote] = useState("");

  const [items, setItems] = useState([emptyItem()]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await apiFetch("/accounts/me/", { method: "GET" });
        if (!cancelled) setMe(res);
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

  const meRole = safeToUpper(me?.role);

  useEffect(() => {
    let cancelled = false;
    async function loadPatients() {
      try {
        setPatientsLoading(true);
        const res = await apiFetch("/patients/?page=1&limit=200", {
          method: "GET",
        });
        if (cancelled) return;
        setPatients(normaliseList(res));
      } catch (e) {
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    }
    loadPatients();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        const res = await apiFetch("/pharmacy/catalog/?page=1&limit=500", {
          method: "GET",
        });
        if (cancelled) return;
        setCatalog(normaliseList(res));
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const patientOptions = useMemo(() => {
    return patients.map((p) => {
      const name =
        p.full_name ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        `Patient #${p.id}`;
      return { id: p.id, label: `${name}${p.phone ? ` • ${p.phone}` : ""}` };
    });
  }, [patients]);

  const catalogOptions = useMemo(() => {
    return catalog
      .filter((d) => d && d.is_active !== false)
      .map((d) => {
        const label = `${d.name || d.code || "Drug"}${d.strength ? ` ${d.strength}` : ""}${d.form ? ` • ${d.form}` : ""}`;
        return { id: d.id, code: d.code, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [catalog]);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const pid = Number(patientId);
    if (!Number.isFinite(pid) || pid <= 0) {
      setError("Select a patient.");
      return;
    }

    const cleanedItems = items
      .map((it) => {
        const useCatalog = Boolean(it.use_catalog);
        const payload = {
          dose: it.dose || "",
          frequency: it.frequency || "",
          duration_days: it.duration_days ? Number(it.duration_days) : null,
          qty_prescribed: it.qty_prescribed ? Number(it.qty_prescribed) : null,
          instruction: it.instruction || "",
        };

        if (useCatalog) {
          return {
            ...payload,
            drug_code: (it.drug_code || "").trim(),
            drug_name: "",
          };
        }

        return {
          ...payload,
          drug_code: "",
          drug_name: (it.drug_name || "").trim(),
        };
      })
      .filter((it) => {
        if (it.drug_code && it.drug_code.length) return true;
        if (it.drug_name && it.drug_name.length) return true;
        return false;
      });

    if (!cleanedItems.length) {
      setError("Add at least one medication item.");
      return;
    }

    const eid = encounterId ? Number(encounterId) : null;

    const payload = {
      patient: pid,
      encounter_id: Number.isFinite(eid) && eid > 0 ? eid : null,
      note: note || "",
      items: cleanedItems,
    };

    try {
      setSaving(true);
      const created = await apiFetch("/pharmacy/prescriptions/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(`Prescription #${created?.id || ""} created.`);
      setTimeout(() => {
        router.push(redirectTo);
      }, 500);
    } catch (e) {
      setError(e?.message || "Failed to create prescription.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-700">
            <Pill className="h-3.5 w-3.5" />
            Prescription
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      {!meLoading && meRole !== "PHARMACY" && meRole !== "ADMIN" && meRole !== "SUPER_ADMIN" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This page is intended for pharmacy staff. If you’re a doctor/nurse, you can still prescribe from the Encounter flow.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {(error || success) && (
            <div>
              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>{error}</div>
                </div>
              ) : null}
              {success ? (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <div>{success}</div>
                </div>
              ) : null}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Patient
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Select patient…</option>
                {patientsLoading ? (
                  <option value="" disabled>
                    Loading patients…
                  </option>
                ) : (
                  patientOptions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Encounter ID (optional)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={encounterId}
                onChange={(e) => setEncounterId(e.target.value)}
                placeholder="e.g. 123"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Instructions to the patient or pharmacist…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Medication items</div>
                <div className="text-sm text-slate-600">
                  Choose from your catalog or enter free-text medication.
                </div>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            </div>

            {items.map((it, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(it.use_catalog)}
                        onChange={(e) =>
                          updateItem(idx, {
                            use_catalog: e.target.checked,
                            drug_code: "",
                            drug_name: "",
                          })
                        }
                      />
                      Use catalog drug
                    </label>
                    {Boolean(it.use_catalog) ? (
                      <span className="text-xs text-slate-500">
                        {catalogLoading ? "Loading catalog…" : `${catalogOptions.length} items`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Free text</span>
                    )}
                  </div>

                  {items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Medication
                    </label>
                    {Boolean(it.use_catalog) ? (
                      <select
                        value={it.drug_code}
                        onChange={(e) =>
                          updateItem(idx, {
                            drug_code: e.target.value,
                            drug_name: "",
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">Select drug…</option>
                        {catalogOptions.map((d) => (
                          <option key={d.id} value={d.code}>
                            {d.label} {d.code ? `(${d.code})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={it.drug_name}
                        onChange={(e) =>
                          updateItem(idx, {
                            drug_name: e.target.value,
                          })
                        }
                        placeholder="e.g. Paracetamol 500mg"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Dose
                    </label>
                    <input
                      type="text"
                      value={it.dose}
                      onChange={(e) => updateItem(idx, { dose: e.target.value })}
                      placeholder="e.g. 1 tab"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Frequency
                    </label>
                    <input
                      type="text"
                      value={it.frequency}
                      onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                      placeholder="e.g. BD"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Duration (days)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={it.duration_days}
                      onChange={(e) => updateItem(idx, { duration_days: e.target.value })}
                      placeholder="e.g. 5"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quantity
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={it.qty_prescribed}
                      onChange={(e) => updateItem(idx, { qty_prescribed: e.target.value })}
                      placeholder="e.g. 10"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Instruction
                    </label>
                    <input
                      type="text"
                      value={it.instruction}
                      onChange={(e) => updateItem(idx, { instruction: e.target.value })}
                      placeholder="e.g. After meals"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create prescription
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
