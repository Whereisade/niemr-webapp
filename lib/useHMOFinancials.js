// lib/useHMOFinancials.js - FIXED VERSION
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Fetch financial data for a specific HMO - FIXED VERSION
 * Properly fetches charges for ONLY the patients in this HMO
 * 
 * Usage:
 *  const { data, error, isLoading, mutate } = useHMOFinancials(hmoId, {
 *    patient: "123",  // optional filter by specific patient
 *    start: "2025-01-01",
 *    end: "2025-01-31",
 *  });
 */
export function useHMOFinancials(hmoId, params = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const stableHmoId = useMemo(() => hmoId, [hmoId]);
  const stableParams = useMemo(() => JSON.stringify(params), [JSON.stringify(params)]);

  const fetchData = async (signal) => {
    if (!stableHmoId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch HMO details
      const hmo = await apiFetch(`/facilities/hmos/${stableHmoId}/`);

      // 2. Fetch patients attached to this HMO
      const patientsRes = await apiFetch(`/patients/?hmo=${stableHmoId}`);
      const patients = Array.isArray(patientsRes) ? patientsRes : patientsRes?.results || [];
      
      if (patients.length === 0) {
        setData({
          hmo,
          patients: [],
          charges: [],
          summary: {
            total_patients: 0,
            charges_total: 0,
            payments_total: 0,
            outstanding: 0,
            charges_count: 0,
          },
        });
        return;
      }

      // 3. Fetch charges for HMO patients
      // If a specific patient is selected, only fetch their charges
      // Otherwise, fetch charges for ALL patients in this HMO
      let allCharges = [];
      
      if (params.patient) {
        // Single patient filter - simple fetch
        const query = new URLSearchParams();
        query.set("patient", params.patient);
        if (params.start) query.set("start", params.start);
        if (params.end) query.set("end", params.end);
        if (params.status) query.set("status", params.status);
        
        const chargesRes = await apiFetch(`/billing/charges/?${query.toString()}`);
        allCharges = Array.isArray(chargesRes) ? chargesRes : chargesRes?.results || [];
      } else {
        // Multiple patients - fetch charges for each patient
        // This is more efficient than fetching ALL facility charges and filtering
        const chargesPromises = patients.map(async (patient) => {
          const query = new URLSearchParams();
          query.set("patient", patient.id);
          if (params.start) query.set("start", params.start);
          if (params.end) query.set("end", params.end);
          if (params.status) query.set("status", params.status);
          
          try {
            const chargesRes = await apiFetch(`/billing/charges/?${query.toString()}`);
            return Array.isArray(chargesRes) ? chargesRes : chargesRes?.results || [];
          } catch (err) {
            console.error(`Failed to fetch charges for patient ${patient.id}:`, err);
            return [];
          }
        });
        
        // Wait for all patient charges to be fetched
        const chargesArrays = await Promise.all(chargesPromises);
        
        // Flatten the arrays into a single array
        allCharges = chargesArrays.flat();
      }

      // 4. Calculate summary statistics
      const chargesTotal = allCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const allocatedTotal = allCharges.reduce((sum, c) => sum + Number(c.allocated_total || 0), 0);
      const outstanding = chargesTotal - allocatedTotal;

      setData({
        hmo,
        patients,
        charges: allCharges,
        summary: {
          total_patients: patients.length,
          charges_total: chargesTotal,
          payments_total: allocatedTotal,
          outstanding: outstanding,
          charges_count: allCharges.length,
        },
      });
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.error("Error fetching HMO financials:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchData(ctrl.signal);

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableHmoId, stableParams]);

  const mutate = () => fetchData(abortRef.current?.signal);

  return { data, error, isLoading, mutate };
}