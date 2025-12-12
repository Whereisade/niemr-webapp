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
      if (!facilityId) {
        throw new Error(
          "Your account is not linked to any facility. Please contact an administrator."
        );
      }

      // 2. Facility detail (includes wards + beds + current_assignment)
      const detail = await apiFetch(`/facilities/${facilityId}/`);

      // 3. Ward summary (capacity + counts)
      const summary = await apiFetch(
        `/facilities/${facilityId}/ward-summary/`
      );

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
      const res = await apiFetch(
        `/facilities/bed-assignments/?bed=${bed.id}`
      );
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

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Wards &amp; Beds</h1>
        <p className="text-sm text-gray-500">Loading facility data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Wards &amp; Beds</h1>
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Wards &amp; Beds</h1>
        <p className="text-sm text-gray-500">
          Facility information is not available.
        </p>
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Wards &amp; Beds – {facility.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure inpatient wards and manage bed occupancy for this
            facility.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-xs text-gray-500">
          <div>
            <div className="font-semibold text-gray-900">
              {wards.length || 0}
            </div>
            <div>Wards</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {totals.bed_count}
            </div>
            <div>Total beds</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {totals.occupied}
            </div>
            <div>Occupied</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {totals.available}
            </div>
            <div>Available</div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* New Ward Form */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Create new ward</h2>
        <form
          onSubmit={handleCreateWard}
          className="grid gap-3 md:grid-cols-[2fr,1fr,1fr,1fr,1fr,auto]"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ward name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Male Surgical Ward"
              value={newWardName}
              onChange={(e) => setNewWardName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Capacity (beds)
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={newWardCapacity}
              onChange={(e) => setNewWardCapacity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ward type
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Gender policy
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={newWardGender}
              onChange={(e) => setNewWardGender(e.target.value)}
            >
              <option value="MIXED">Mixed</option>
              <option value="MALE_ONLY">Male only</option>
              <option value="FEMALE_ONLY">Female only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Floor / Block (optional)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Ground, 1st floor, Block B"
              value={newWardFloor}
              onChange={(e) => setNewWardFloor(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creatingWard}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingWard ? "Creating…" : "Add Ward"}
            </button>
          </div>
        </form>
      </section>

      {/* Ward Summary Table */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Ward overview</h2>
        {wardSummary.length === 0 ? (
          <p className="text-sm text-gray-500">
            No wards have been configured yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Ward</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Type / Gender
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Capacity
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Beds created
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Occupied
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Available
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Floor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wardSummary.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      {w.name}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-600">
                      <div>{w.ward_type_display}</div>
                      <div className="text-[10px] text-gray-500">
                        {w.gender_policy_display}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-sm">
                      {w.capacity}
                    </td>
                    <td className="px-3 py-2 text-right text-sm">
                      {w.bed_count}
                    </td>
                    <td className="px-3 py-2 text-right text-sm">
                      {w.occupied_beds}
                    </td>
                    <td className="px-3 py-2 text-right text-sm">
                      {w.available_beds}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {w.floor || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Wards + bed chips + add/assign/discharge */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Manage beds per ward</h2>
        {wards.length === 0 ? (
          <p className="text-sm text-gray-500">
            No wards have been configured yet. Use the form above to add your
            first ward.
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
                  b.status === "AVAILABLE" &&
                  b.is_operational !== false
              );
              const occupiedBedsForDischarge = beds.filter(
                (b) =>
                  b.status === "OCCUPIED" &&
                  b.current_assignment
              );

              return (
                <div
                  key={ward.id}
                  className="rounded-xl border px-4 py-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                >
                  {/* Left: ward info + bed chips */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{ward.name}</h3>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                        Ward ID: {ward.id}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 space-x-3">
                      <span>
                        Capacity:{" "}
                        <span className="font-semibold">
                          {ward.capacity ?? "—"}
                        </span>
                      </span>
                      <span>|</span>
                      <span>
                        Beds created:{" "}
                        <span className="font-semibold">{beds.length}</span>
                      </span>
                    </div>
                    {beds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {beds.slice(0, 20).map((bed) => {
                          const assignment = bed.current_assignment;
                          const patientDisplay =
                            assignment?.patient?.display_name || "";
                          const status = bed.status;

                          const baseClasses =
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]";
                          let statusClasses =
                            "border-emerald-200 bg-emerald-50 text-emerald-700";

                          if (status === "OCCUPIED") {
                            statusClasses =
                              "border-red-200 bg-red-50 text-red-700";
                          } else if (status === "OUT_OF_SERVICE") {
                            statusClasses =
                              "border-gray-200 bg-gray-50 text-gray-600";
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
                              <span>{bed.number}</span>
                              {patientDisplay && (
                                <span className="truncate max-w-[110px]">
                                  • {patientDisplay}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {beds.length > 20 && (
                          <span className="text-[11px] text-gray-500">
                            +{beds.length - 20} more…
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: bed creation + assign + discharge */}
                  <div className="md:w-80 space-y-3">
                    {/* Add beds */}
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Add beds to this ward
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          type="number"
                          min={1}
                          className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Number of beds"
                          value={bedCfg.count || ""}
                          onChange={(e) =>
                            updateBedConfig(ward.id, "count", e.target.value)
                          }
                        />
                        <input
                          type="text"
                          className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 md:max-w-[120px]"
                          placeholder="Prefix (optional)"
                          value={bedCfg.prefix || ""}
                          onChange={(e) =>
                            updateBedConfig(ward.id, "prefix", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleAddBeds(ward)}
                          disabled={isSavingBeds}
                          className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSavingBeds ? "Saving…" : "Add beds"}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Bed numbers will be generated as{" "}
                        <span className="font-mono">
                          {bedCfg.prefix || "1"}
                          {bedCfg.prefix ? "1" : ""},{" "}
                          {bedCfg.prefix || "2"}
                          {bedCfg.prefix ? "2" : ""}, …
                        </span>{" "}
                        continuing from existing beds.
                      </p>
                    </div>

                    {/* Assign bed */}
                    <div className="border-t pt-3">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Assign patient to bed
                      </div>
                      {loadingPatients ? (
                        <p className="text-[11px] text-gray-500">
                          Loading patients…
                        </p>
                      ) : patients.length === 0 ? (
                        <p className="text-[11px] text-gray-500">
                          No patients found for this facility.
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2">
                            <select
                              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {assigning ? "Assigning…" : "Assign bed"}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Assigned beds automatically change from
                            &quot;Available&quot; to &quot;Occupied&quot;.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Discharge bed */}
                    <div className="border-t pt-3">
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Discharge bed
                      </div>
                      {occupiedBedsForDischarge.length === 0 ? (
                        <p className="text-[11px] text-gray-500">
                          No occupied beds in this ward.
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2">
                            <select
                              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                                  <option
                                    key={b.id}
                                    value={String(b.id)}
                                  >
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
                              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {discharging ? "Discharging…" : "Discharge bed"}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">
                            Discharging will free the bed and mark it as
                            available again.
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
      </section>

      {/* Bed history modal */}
      {historyForBed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="max-h-[80vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Bed history – {historyForBed.bedNumber}
                </h3>
                <p className="text-xs text-gray-500">
                  Ward: {historyForBed.wardName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeBedHistory}
                className="rounded-full px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-3 text-xs">
              {loadingHistory && (
                <p className="text-gray-500">Loading history…</p>
              )}

              {historyError && (
                <div className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {historyError}
                </div>
              )}

              {!loadingHistory &&
                !historyError &&
                bedHistory.length === 0 && (
                  <p className="text-gray-500">
                    No past assignments recorded for this bed.
                  </p>
                )}

              {!loadingHistory &&
                !historyError &&
                bedHistory.length > 0 && (
                  <div className="overflow-y-auto max-h-[60vh]">
                    <table className="min-w-full text-[11px]">
                      <thead className="border-b bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold">
                            Patient
                          </th>
                          <th className="px-2 py-1 text-left font-semibold">
                            Encounter
                          </th>
                          <th className="px-2 py-1 text-left font-semibold">
                            Status
                          </th>
                          <th className="px-2 py-1 text-left font-semibold">
                            Assigned
                          </th>
                          <th className="px-2 py-1 text-left font-semibold">
                            Discharged
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
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
                                    : "bg-gray-50 text-gray-600"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-2 py-1 text-[10px] text-gray-600">
                              {item.assigned_at
                                ? new Date(
                                    item.assigned_at
                                  ).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-2 py-1 text-[10px] text-gray-600">
                              {item.discharged_at
                                ? new Date(
                                    item.discharged_at
                                  ).toLocaleString()
                                : item.status === "ACTIVE"
                                ? "Active"
                                : "—"}
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


