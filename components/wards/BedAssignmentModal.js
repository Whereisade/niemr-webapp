"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  X,
  Loader2,
  Bed,
  AlertCircle,
  CheckCircle2,
  Building2,
} from "lucide-react";

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * BedAssignmentModal - Reusable modal for assigning patients to beds
 * 
 * Props:
 * - isOpen: boolean - controls modal visibility
 * - onClose: function - called when modal should close
 * - patientId: number - ID of patient to assign
 * - patientName: string - display name of patient
 * - encounterId: number - optional encounter ID to link assignment to
 * - onSuccess: function - called after successful assignment with assignment data
 */
export default function BedAssignmentModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  encounterId,
  onSuccess,
}) {
  const [wards, setWards] = useState([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [wardsError, setWardsError] = useState("");

  const [selectedWardId, setSelectedWardId] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");

  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load wards when modal opens
  useEffect(() => {
    if (!isOpen) return;

    loadWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedWardId("");
      setSelectedBedId("");
      setError("");
      setSuccess("");
    }
  }, [isOpen]);

  async function loadWards() {
    setLoadingWards(true);
    setWardsError("");
    try {
      // Get current user's facility
      const me = await apiFetch("/accounts/me/");
      const facilityId = me?.facility?.id;

      if (!facilityId) {
        throw new Error("No facility linked to your account");
      }

      // Get facility detail with wards and beds
      const detail = await apiFetch(`/facilities/${facilityId}/`);
      const wardsList = detail?.wards || [];

      setWards(wardsList);
    } catch (err) {
      console.error("Failed to load wards:", err);
      setWardsError(err?.message || "Failed to load wards");
      setWards([]);
    } finally {
      setLoadingWards(false);
    }
  }

  const selectedWard = useMemo(() => {
    if (!selectedWardId) return null;
    return wards.find((w) => String(w.id) === String(selectedWardId)) || null;
  }, [wards, selectedWardId]);

  const availableBeds = useMemo(() => {
    if (!selectedWard) return [];
    const beds = Array.isArray(selectedWard.beds) ? selectedWard.beds : [];
    
    return beds.filter(
      (b) =>
        b.status === "AVAILABLE" &&
        b.is_operational !== false &&
        !b.current_assignment
    );
  }, [selectedWard]);

  const selectedBed = useMemo(() => {
    if (!selectedBedId || !availableBeds.length) return null;
    return availableBeds.find((b) => String(b.id) === String(selectedBedId)) || null;
  }, [availableBeds, selectedBedId]);

  async function handleAssign(e) {
    e.preventDefault();
    
    if (!patientId) {
      setError("No patient selected");
      return;
    }

    if (!selectedBedId) {
      setError("Please select a bed");
      return;
    }

    setAssigning(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        bed: Number(selectedBedId),
        patient: Number(patientId),
      };

      if (encounterId) {
        payload.encounter = Number(encounterId);
      }

      const result = await apiFetch("/facilities/bed-assignments/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess("Bed assigned successfully!");
      
      // Call success callback after short delay
      setTimeout(() => {
        onSuccess?.(result);
        onClose?.();
      }, 800);
    } catch (err) {
      console.error("Failed to assign bed:", err);
      setError(err?.message || "Failed to assign bed");
    } finally {
      setAssigning(false);
    }
  }

  function handleWardChange(e) {
    const value = e.target.value;
    setSelectedWardId(value);
    setSelectedBedId(""); // Reset bed selection when ward changes
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Bed className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Assign Inpatient Bed
              </h2>
              <p className="text-sm text-slate-500">
                {patientName || `Patient #${patientId}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Success Message */}
          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Wards Error */}
          {wardsError && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{wardsError}</p>
            </div>
          )}

          {/* Loading State */}
          {loadingWards ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading wards and beds...</span>
              </div>
            </div>
          ) : wards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">No wards configured</p>
              <p className="mt-1 text-xs text-slate-500">
                Contact your facility administrator to set up wards and beds.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAssign} className="space-y-4">
              {/* Ward Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Select Ward
                </label>
                <select
                  value={selectedWardId}
                  onChange={handleWardChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  disabled={assigning}
                >
                  <option value="">Choose a ward...</option>
                  {wards.map((ward) => {
                    const beds = Array.isArray(ward.beds) ? ward.beds : [];
                    const availableCount = beds.filter(
                      (b) =>
                        b.status === "AVAILABLE" &&
                        b.is_operational !== false &&
                        !b.current_assignment
                    ).length;

                    const meta = [
                      ward.ward_type_display,
                      ward.gender_policy_display,
                      ward.floor,
                    ]
                      .filter(Boolean)
                      .join(" • ");

                    return (
                      <option key={ward.id} value={String(ward.id)}>
                        {ward.name}
                        {meta ? ` — ${meta}` : ""}
                        {` (${availableCount} available)`}
                      </option>
                    );
                  })}
                </select>
                {selectedWard && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {selectedWard.ward_type_display || "General"} •{" "}
                    {selectedWard.gender_policy_display || "Mixed"} •{" "}
                    {availableBeds.length} bed(s) available
                  </p>
                )}
              </div>

              {/* Bed Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Select Bed
                </label>
                <select
                  value={selectedBedId}
                  onChange={(e) => setSelectedBedId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  disabled={!selectedWardId || assigning}
                >
                  <option value="">
                    {!selectedWardId
                      ? "Select a ward first"
                      : availableBeds.length === 0
                      ? "No available beds in this ward"
                      : "Choose a bed..."}
                  </option>
                  {availableBeds.map((bed) => {
                    const features = [];
                    if (bed.has_oxygen) features.push("O₂");
                    if (bed.has_monitor) features.push("Monitor");
                    if (bed.bed_class && bed.bed_class !== "GENERAL") {
                      features.push(bed.bed_class.replace(/_/g, " "));
                    }

                    return (
                      <option key={bed.id} value={String(bed.id)}>
                        Bed {bed.number}
                        {features.length ? ` (${features.join(", ")})` : ""}
                      </option>
                    );
                  })}
                </select>
                {selectedBed && (
                  <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-medium text-slate-700">
                      Bed {selectedBed.number}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span>Class: {selectedBed.bed_class_display || selectedBed.bed_class || "General"}</span>
                      {selectedBed.has_oxygen && <span>• Oxygen</span>}
                      {selectedBed.has_monitor && <span>• Monitor</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={assigning}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedBedId || assigning}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {assigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Bed className="h-4 w-4" />
                      Assign Bed
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}