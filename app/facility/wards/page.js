"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

function numberOrNull(value) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export default function FacilityWardsPage() {
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState(null);
  const [wardSummary, setWardSummary] = useState([]);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null); // ✅ Track user role

  // Patients (for bed assignments)
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // New ward form
  const [newWardName, setNewWardName] = useState("");
  const [newWardCapacity, setNewWardCapacity] = useState("");
  const [newWardType, setNewWardType] = useState("GENERAL");
  const [newWardGender, setNewWardGender] = useState("MIXED");
  const [newWardFloor, setNewWardFloor] = useState("");
  const [creatingWard, setCreatingWard] = useState(false);

  // Bed creation per ward
  const [bedConfigs, setBedConfigs] = useState({});
  const [savingBedsWardId, setSavingBedsWardId] = useState(null);

  // Bed assignment per ward
  const [assignConfig, setAssignConfig] = useState({});
  const [assigning, setAssigning] = useState(false);

  // Bed discharge per ward
  const [dischargeConfig, setDischargeConfig] = useState({});
  const [discharging, setDischarging] = useState(false);

  // Bed history modal
  const [historyForBed, setHistoryForBed] = useState(null); // { bedId, bedNumber, wardName }
  const [bedHistory, setBedHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Flash message
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    setLoadingPatients(true);
    try {
      // 1. Who am I?
      const me = await apiFetch("/accounts/me/");
      const facilityId = me?.facility?.id;
      const role = me?.role; // ✅ Extract user role

      setUserRole(role); // ✅ Store user role

      if (!facilityId) {
        throw new Error(
          "Your account is not linked to any facility. Please contact an administrator."
        );
      }

      // 2. Facility detail (includes wards + beds + current_assignment)
      const detail = await apiFetch(`/facilities/${facilityId}/`);

      // 3. Ward summary (capacity + counts)
      const summary = await apiFetch(`/facilities/${facilityId}/ward-summary/`);

      // 4. Facility patients (for bed assignment)
      let patientsList = [];
      try {
        const patientsRes = await apiFetch("/patients/?page=1&limit=50");
        patientsList = Array.isArray(patientsRes)
          ? patientsRes
          : patientsRes?.results || [];
      } catch (e) {
        console.warn("Failed to load patients for bed assignment", e);
      }

      setFacility(detail || null);
      setWardSummary(Array.isArray(summary) ? summary : []);
      setPatients(patientsList);
      setLoadingPatients(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load ward data.");
      setLoadingPatients(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(id);
  }, [message]);

  async function handleCreateWard(e) {
    e.preventDefault();
    if (!facility) return;

    const name = newWardName.trim();
    const capacity = numberOrNull(newWardCapacity);

    if (!name) {
      setMessage({ type: "error", text: "Ward name is required." });
      return;
    }
    if (capacity === null || capacity <= 0) {
      setMessage({
        type: "error",
        text: "Capacity must be a positive number.",
      });
      return;
    }

    setCreatingWard(true);
    try {
      await apiFetch(`/facilities/${facility.id}/add_ward/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          capacity,
          ward_type: newWardType,
          gender_policy: newWardGender,
          floor: newWardFloor || undefined,
        }),
      });

      setMessage({ type: "success", text: "Ward created successfully." });
      setNewWardName("");
      setNewWardCapacity("");
      setNewWardType("GENERAL");
      setNewWardGender("MIXED");
      setNewWardFloor("");
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.message || "Failed to create ward.",
      });
    } finally {
      setCreatingWard(false);
    }
  }

  function updateBedConfig(wardId, field, value) {
    setBedConfigs((prev) => ({
      ...prev,
      [wardId]: {
        ...(prev[wardId] || {}),
        [field]: value,
      },
    }));
  }

  function updateAssignConfig(wardId, field, value) {
    setAssignConfig((prev) => ({
      ...prev,
      [wardId]: {
        ...(prev[wardId] || {}),
        [field]: value,
      },
    }));
  }

  function updateDischargeConfig(wardId, field, value) {
    setDischargeConfig((prev) => ({
      ...prev,
      [wardId]: {
        ...(prev[wardId] || {}),
        [field]: value,
      },
    }));
  }

  async function handleAddBeds(ward) {
    if (!facility || !ward?.id) return;

    const config = bedConfigs[ward.id] || {};
    const count = numberOrNull(config.count);
    const prefix = (config.prefix || "").trim();

    if (count === null || count <= 0) {
      setMessage({
        type: "error",
        text: "Number of beds must be a positive number.",
      });
      return;
    }

    const beds = Array.isArray(ward.beds) ? ward.beds : [];
    const existingCount = beds.length;
    const startIndex = existingCount + 1;

    const items = Array.from({ length: count }, (_, idx) => ({
      number: prefix
        ? `${prefix}${startIndex + idx}`
        : String(startIndex + idx),
      is_available: true,
    }));

    setSavingBedsWardId(ward.id);
    try {
      await apiFetch(`/facilities/${facility.id}/add_bed/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ward: ward.id,
          items,
        }),
      });
      setMessage({
        type: "success",
        text: `Added ${count} bed(s) to ward "${ward.name}".`,
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.message || "Failed to add beds.",
      });
    } finally {
      setSavingBedsWardId(null);
    }
  }

  async function handleAssignBed(ward) {
    const config = assignConfig[ward.id] || {};
    const bedId = Number(config.bed);
    const patientId = Number(config.patient);

    if (!bedId || Number.isNaN(bedId)) {
      setMessage({ type: "error", text: "Please select a bed." });
      return;
    }
    if (!patientId || Number.isNaN(patientId)) {
      setMessage({ type: "error", text: "Please select a patient." });
      return;
    }

    setAssigning(true);
    try {
      await apiFetch("/facilities/bed-assignments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bed: bedId,
          patient: patientId,
        }),
      });
      setMessage({ type: "success", text: "Bed assigned successfully." });
      await loadData();
      setAssignConfig((prev) => ({
        ...prev,
        [ward.id]: { bed: "", patient: "" },
      }));
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.message || "Failed to assign bed.",
      });
    } finally {
      setAssigning(false);
    }
  }

  async function handleDischargeBed(ward) {
    const cfg = dischargeConfig[ward.id] || {};
    const bedId = Number(cfg.bed);
    if (!bedId || Number.isNaN(bedId)) {
      setMessage({
        type: "error",
        text: "Please select a bed to discharge.",
      });
      return;
    }

    const beds = Array.isArray(ward.beds) ? ward.beds : [];
    const bed = beds.find((b) => b.id === bedId);
    if (!bed) {
      setMessage({
        type: "error",
        text: "Selected bed was not found in this ward.",
      });
      return;
    }

    const assignment = bed.current_assignment;
    if (!assignment) {
      setMessage({
        type: "error",
        text: "No active assignment found for this bed.",
      });
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm("Discharge patient from this bed?")
    ) {
      return;
    }

    setDischarging(true);
    try {
      await apiFetch(
        `/facilities/bed-assignments/${assignment.id}/discharge/`,
        {
          method: "POST",
        }
      );
      setMessage({
        type: "success",
        text: "Bed discharged successfully.",
      });
      await loadData();
      setDischargeConfig((prev) => ({
        ...prev,
        [ward.id]: { bed: "" },
      }));
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.message || "Failed to discharge bed.",
      });
    } finally {
      setDischarging(false);
    }
  }

  async function openBedHistory(bed, ward) {
    setHistoryForBed({
      bedId: bed.id,
      bedNumber: bed.number,
      wardName: ward.name,
    });
    setBedHistory([]);
    setHistoryError(null);
    setLoadingHistory(true);

    try {
      const res = await apiFetch(`/facilities/bed-assignments/?bed=${bed.id}`);
      const items = Array.isArray(res) ? res : res?.results || [];
      setBedHistory(items);
    } catch (err) {
      console.error(err);
      setHistoryError(err.message || "Failed to load bed history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  function closeBedHistory() {
    setHistoryForBed(null);
    setBedHistory([]);
    setHistoryError(null);
  }

  // ✅ Check if user can create wards
  const canCreateWard = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/80 p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Inpatient configuration
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Wards &amp; Beds
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Loading facility data&hellip;
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/80 p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Ward management
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Wards &amp; Beds
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure inpatient wards and manage bed occupancy.
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-slate-50/80 p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Wards &amp; Beds
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Facility information is not available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const wards = facility.wards || [];

  const totals = wardSummary.reduce(
    (acc, w) => {
      acc.capacity += w.capacity || 0;
      acc.bed_count += w.bed_count || 0;
      acc.occupied += w.occupied_beds || 0;
      acc.available += w.available_beds || 0;
      return acc;
    },
    { capacity: 0, bed_count: 0, occupied: 0, available: 0 }
  );

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header + KPI strip */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 px-5 py-5 shadow-sm">
            <div className="pointer-events-none absolute inset-x-0 -top-24 h-32 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-emerald-500/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Inpatient capacity
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                  Wards &amp; Beds{" "}
                  <span className="text-sm font-medium text-slate-500">
                    &mdash; {facility.name}
                  </span>
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-slate-500">
                  Configure wards, generate beds, and track admission &amp;
                  discharge status in real time.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-right text-xs text-slate-500 sm:grid-cols-4 md:text-sm">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500">
                    Wards
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-slate-900">
                    {wards.length || 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500">
                    Total beds
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-slate-900">
                    {totals.bed_count}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-rose-50/70 px-3 py-2">
                  <div className="text-[11px] font-medium text-rose-700">
                    Occupied
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-rose-700">
                    {totals.occupied}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-emerald-50/70 px-3 py-2">
                  <div className="text-[11px] font-medium text-emerald-700">
                    Available
                  </div>
                  <div className="mt-0.5 text-lg font-semibold text-emerald-700">
                    {totals.available}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <span className="mt-0.5 h-2 w-2 rounded-full bg-current" />
              <p>{message.text}</p>
            </div>
          )}
        </div>

        {/* Top grid: create ward + overview */}
        <div
          className={`grid gap-6 ${
            canCreateWard
              ? "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.8fr)]"
              : ""
          }`}
        >
          {/* ✅ Only show New Ward Form to SUPER_ADMIN and ADMIN */}
          {canCreateWard && (
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />
              <div className="relative space-y-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                    Create new ward
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Define a new inpatient ward with capacity, type, and gender
                    policy. Beds can be generated later in bulk.
                  </p>
                </div>

                <form
                  onSubmit={handleCreateWard}
                  className="grid gap-3 md:grid-cols-2"
                >
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Ward name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      placeholder="e.g. Male Surgical Ward"
                      value={newWardName}
                      onChange={(e) => setNewWardName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Capacity (beds)
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      value={newWardCapacity}
                      onChange={(e) => setNewWardCapacity(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Ward type
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      value={newWardType}
                      onChange={(e) => setNewWardType(e.target.value)}
                    >
                      <option value="GENERAL">General</option>
                      <option value="ICU">ICU</option>
                      <option value="PICU">Pediatric ICU</option>
                      <option value="NICU">Neonatal ICU</option>
                      <option value="MATERNITY">Maternity</option>
                      <option value="ISOLATION">Isolation</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Gender policy
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      value={newWardGender}
                      onChange={(e) => setNewWardGender(e.target.value)}
                    >
                      <option value="MIXED">Mixed</option>
                      <option value="MALE_ONLY">Male only</option>
                      <option value="FEMALE_ONLY">Female only</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Floor / Block (optional)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      placeholder="e.g. Ground, 1st floor, Block B"
                      value={newWardFloor}
                      onChange={(e) => setNewWardFloor(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-slate-500">
                      Wards define the shell. You can generate individual bed
                      numbers for each ward below.
                    </p>
                    <button
                      type="submit"
                      disabled={creatingWard}
                      className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingWard ? "Creating…" : "Add ward"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* Ward Summary Table */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600" />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                    Ward overview
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    High-level capacity and occupancy across all configured
                    wards.
                  </p>
                </div>
              </div>

              {wardSummary.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  {canCreateWard
                    ? "No wards have been configured yet. Create your first ward on the left to get started."
                    : "No wards have been configured yet. Please contact an administrator to create wards."}
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr className="text-left">
                        <th className="px-3 py-2 text-xs font-semibold">
                          Ward
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold">
                          Type / Gender
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">
                          Capacity
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">
                          Beds
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">
                          Occupied
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">
                          Available
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold">
                          Floor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {wardSummary.map((w) => (
                        <tr
                          key={w.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-3 py-2 text-sm font-medium text-slate-900">
                            {w.name}
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-600">
                            <div>{w.ward_type_display}</div>
                            <div className="text-[10px] text-slate-500">
                              {w.gender_policy_display}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-slate-900">
                            {w.capacity}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-slate-900">
                            {w.bed_count}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-rose-700">
                            {w.occupied_beds}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-emerald-700">
                            {w.available_beds}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {w.floor || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Wards + bed chips + add/assign/discharge */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-600 to-emerald-500" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Manage beds per ward
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Generate bed numbers, admit patients, and discharge beds from
                  each ward. Click on a bed chip to view its full assignment
                  history.
                </p>
              </div>
            </div>

            {wards.length === 0 ? (
              <p className="text-sm text-slate-500">
                {canCreateWard
                  ? "No wards have been configured yet. Use the form above to add your first ward."
                  : "No wards have been configured yet. Please contact an administrator to create wards."}
              </p>
            ) : (
              <div className="space-y-4">
                {wards.map((ward) => {
                  const beds = Array.isArray(ward.beds) ? ward.beds : [];
                  const bedCfg = bedConfigs[ward.id] || {};
                  const assignCfg = assignConfig[ward.id] || {};
                  const dischargeCfg = dischargeConfig[ward.id] || {};
                  const isSavingBeds = savingBedsWardId === ward.id;

                  const availableBedsForAssign = beds.filter(
                    (b) =>
                      b.status === "AVAILABLE" && b.is_operational !== false
                  );
                  const occupiedBedsForDischarge = beds.filter(
                    (b) => b.status === "OCCUPIED" && b.current_assignment
                  );

                  return (
                    <div
                      key={ward.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-blue-200 hover:bg-slate-50 md:flex-row md:items-start md:justify-between"
                    >
                      {/* Left: ward info + bed chips */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {ward.name}
                          </h3>
                          <span className="inline-flex items-center rounded-full bg-slate-900/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                            Ward ID: {ward.id}
                          </span>
                          {ward.floor && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                              {ward.floor}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                          <span>
                            Capacity:{" "}
                            <span className="font-semibold text-slate-900">
                              {ward.capacity ?? "—"}
                            </span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            Beds created:{" "}
                            <span className="font-semibold text-slate-900">
                              {beds.length}
                            </span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            Type:{" "}
                            <span className="font-medium">
                              {ward.ward_type_display || ward.ward_type || "—"}
                            </span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            Gender:{" "}
                            <span className="font-medium">
                              {ward.gender_policy_display ||
                                ward.gender_policy ||
                                "—"}
                            </span>
                          </span>
                        </div>

                        {beds.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {beds.slice(0, 20).map((bed) => {
                              const assignment = bed.current_assignment;
                              const patientDisplay =
                                assignment?.patient?.display_name || "";
                              const status = bed.status;

                              const baseClasses =
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] shadow-sm transition";
                              let statusClasses =
                                "border-emerald-200 bg-emerald-50 text-emerald-700";

                              if (status === "OCCUPIED") {
                                statusClasses =
                                  "border-rose-200 bg-rose-50 text-rose-700";
                              } else if (status === "OUT_OF_SERVICE") {
                                statusClasses =
                                  "border-slate-200 bg-slate-50 text-slate-500";
                              } else if (status === "CLEANING") {
                                statusClasses =
                                  "border-amber-200 bg-amber-50 text-amber-700";
                              }

                              return (
                                <button
                                  key={bed.id}
                                  type="button"
                                  onClick={() => openBedHistory(bed, ward)}
                                  className={`${baseClasses} ${statusClasses} cursor-pointer`}
                                  title={
                                    patientDisplay
                                      ? `Click to view history for ${bed.number} (${patientDisplay})`
                                      : `Click to view history for ${bed.number}`
                                  }
                                >
                                  <span className="font-medium">
                                    {bed.number}
                                  </span>
                                  {patientDisplay && (
                                    <span className="max-w-[140px] truncate">
                                      • {patientDisplay}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            {beds.length > 20 && (
                              <span className="text-[11px] text-slate-500">
                                +{beds.length - 20} more…
                              </span>
                            )}
                          </div>
                        )}

                        {beds.length === 0 && (
                          <p className="mt-3 text-[11px] text-slate-500">
                            No beds have been created for this ward yet. Use the
                            panel on the right to generate beds in bulk.
                          </p>
                        )}
                      </div>

                      {/* Right: bed creation + assign + discharge */}
                      <div className="md:w-80 space-y-3 rounded-2xl bg-white/80 p-3 shadow-sm">
                        {/* Add beds */}
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              Add beds to this ward
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <input
                              type="number"
                              min={1}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                              placeholder="Number of beds"
                              value={bedCfg.count || ""}
                              onChange={(e) =>
                                updateBedConfig(
                                  ward.id,
                                  "count",
                                  e.target.value
                                )
                              }
                            />
                            <input
                              type="text"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 md:max-w-[120px]"
                              placeholder="Prefix (optional)"
                              value={bedCfg.prefix || ""}
                              onChange={(e) =>
                                updateBedConfig(
                                  ward.id,
                                  "prefix",
                                  e.target.value
                                )
                              }
                            />
                            <button
                              type="button"
                              onClick={() => handleAddBeds(ward)}
                              disabled={isSavingBeds}
                              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSavingBeds ? "Saving…" : "Add beds"}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Bed numbers will continue from existing beds, e.g.{" "}
                            <span className="font-mono">
                              {bedCfg.prefix || "1"}
                              {bedCfg.prefix ? "1" : ""}, {bedCfg.prefix || "2"}
                              {bedCfg.prefix ? "2" : ""}, …
                            </span>
                            .
                          </p>
                        </div>

                        {/* Assign bed */}
                        <div className="border-t border-slate-100 pt-3">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                            Assign patient to bed
                          </div>
                          {loadingPatients ? (
                            <p className="text-[11px] text-slate-500">
                              Loading patients…
                            </p>
                          ) : patients.length === 0 ? (
                            <p className="text-[11px] text-slate-500">
                              No patients found for this facility.
                            </p>
                          ) : (
                            <>
                              <div className="flex flex-col gap-2">
                                <select
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                  value={assignCfg.bed || ""}
                                  onChange={(e) =>
                                    updateAssignConfig(
                                      ward.id,
                                      "bed",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="">
                                    {availableBedsForAssign.length === 0
                                      ? "No available beds"
                                      : "Select bed"}
                                  </option>
                                  {availableBedsForAssign.map((b) => (
                                    <option key={b.id} value={String(b.id)}>
                                      {b.number}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                  value={assignCfg.patient || ""}
                                  onChange={(e) =>
                                    updateAssignConfig(
                                      ward.id,
                                      "patient",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="">Select patient</option>
                                  {patients.map((p) => {
                                    const displayName =
                                      [p.first_name, p.last_name]
                                        .filter(Boolean)
                                        .join(" ") ||
                                      p.email ||
                                      p.phone ||
                                      `Patient #${p.id}`;
                                    return (
                                      <option key={p.id} value={String(p.id)}>
                                        {displayName}
                                      </option>
                                    );
                                  })}
                                </select>

                                <button
                                  type="button"
                                  disabled={assigning}
                                  onClick={() => handleAssignBed(ward)}
                                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {assigning ? "Assigning…" : "Assign bed"}
                                </button>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Assigned beds automatically move from{" "}
                                <span className="font-medium">Available</span>{" "}
                                to <span className="font-medium">Occupied</span>
                                .
                              </p>
                            </>
                          )}
                        </div>

                        {/* Discharge bed */}
                        <div className="border-t border-slate-100 pt-3">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                            Discharge bed
                          </div>
                          {occupiedBedsForDischarge.length === 0 ? (
                            <p className="text-[11px] text-slate-500">
                              No occupied beds in this ward.
                            </p>
                          ) : (
                            <>
                              <div className="flex flex-col gap-2">
                                <select
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                  value={dischargeCfg.bed || ""}
                                  onChange={(e) =>
                                    updateDischargeConfig(
                                      ward.id,
                                      "bed",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="">Select occupied bed</option>
                                  {occupiedBedsForDischarge.map((b) => {
                                    const displayName =
                                      b.current_assignment?.patient
                                        ?.display_name || "";
                                    return (
                                      <option key={b.id} value={String(b.id)}>
                                        {b.number}
                                        {displayName ? ` – ${displayName}` : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  disabled={discharging}
                                  onClick={() => handleDischargeBed(ward)}
                                  className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {discharging
                                    ? "Discharging…"
                                    : "Discharge bed"}
                                </button>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Discharging frees the bed and marks it as{" "}
                                <span className="font-medium">Available</span>{" "}
                                again.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bed history modal */}
      {historyForBed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Bed history &mdash; {historyForBed.bedNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Ward: {historyForBed.wardName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeBedHistory}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-3 text-xs">
              {loadingHistory && (
                <p className="text-slate-500">Loading history…</p>
              )}

              {historyError && (
                <div className="mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                  {historyError}
                </div>
              )}

              {!loadingHistory && !historyError && bedHistory.length === 0 && (
                <p className="text-slate-500">
                  No past assignments recorded for this bed.
                </p>
              )}

              {!loadingHistory && !historyError && bedHistory.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-100">
                  <table className="min-w-full text-[11px]">
                    <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-2 py-1 text-left text-[11px] font-semibold">
                          Patient
                        </th>
                        <th className="px-2 py-1 text-left text-[11px] font-semibold">
                          Encounter
                        </th>
                        <th className="px-2 py-1 text-left text-[11px] font-semibold">
                          Status
                        </th>
                        <th className="px-2 py-1 text-left text-[11px] font-semibold">
                          Assigned
                        </th>
                        <th className="px-2 py-1 text-left text-[11px] font-semibold">
                          Admitted By
                        </th>
                        <th className="px-2 py-1 text-left text-[11px] font-semibold">
                          Discharged
                        </th>
                        <th className="px-2 py-1 text-left text-[11px] font-semibold">
                          Discharged By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bedHistory.map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-1">
                            {item.patient_display ||
                              item.patient ||
                              `#${item.patient}`}
                          </td>
                          <td className="px-2 py-1">
                            {item.encounter ? `#${item.encounter}` : "—"}
                          </td>
                          <td className="px-2 py-1">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                                item.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-50 text-slate-600"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-2 py-1 text-[10px] text-slate-600">
                            {item.assigned_at
                              ? new Date(item.assigned_at).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-2 py-1 text-[10px] text-slate-600">
                            {item.assigned_by_name || "—"}
                          </td>
                          <td className="px-2 py-1 text-[10px] text-slate-600">
                            {item.discharged_at
                              ? new Date(item.discharged_at).toLocaleString()
                              : item.status === "ACTIVE"
                              ? "Active"
                              : "—"}
                          </td>
                          <td className="px-2 py-1 text-[10px] text-slate-600">
                            {item.discharged_by_name ||
                              (item.status === "ACTIVE" ? "—" : "Unknown")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
