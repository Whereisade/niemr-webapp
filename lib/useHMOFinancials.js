// lib/useHMOFinancials.js - CLIENT-SIDE FILTERING VERSION
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Fetch financial data for a specific HMO
 * CLIENT-SIDE FILTERING VERSION - filters patients by HMO on frontend
 * 
 * This version fetches ALL patients and filters them client-side by HMO.
 * Use this if the backend /patients/?hmo=X endpoint is not filtering correctly.
 * 
 * For better performance, implement backend filtering in PatientViewSet.
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

      // 2. Fetch ALL patients (backend filtering might not be working)
      // We'll filter client-side
      const patientsRes = await apiFetch(`/patients/?page=1&limit=1000`);
      const allPatients = Array.isArray(patientsRes) 
        ? patientsRes 
        : patientsRes?.results || [];
      
      // 🔧 CLIENT-SIDE FILTERING: Only keep patients with this HMO
      const patients = allPatients.filter(p => {
        // Try multiple field patterns that might contain the HMO ID
        const patientHmoId = p.hmo_id || p.hmo?.id || p.hmo;
        return String(patientHmoId) === String(stableHmoId);
      });

      console.log(`[HMO ${hmo.name}] Filtered ${patients.length} patients from ${allPatients.length} total`);
      
      if (patients.length === 0) {
        console.warn(`[HMO ${hmo.name}] No patients found! Check if patients have hmo_id field set.`);
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
      let allCharges = [];
      
      if (params.patient) {
        // Single patient filter
        const query = new URLSearchParams();
        query.set("patient", params.patient);
        if (params.start) query.set("start", params.start);
        if (params.end) query.set("end", params.end);
        if (params.status) query.set("status", params.status);
        
        const chargesRes = await apiFetch(`/billing/charges/?${query.toString()}`);
        allCharges = Array.isArray(chargesRes) ? chargesRes : chargesRes?.results || [];
      } else {
        // Multiple patients - fetch charges for each
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
        
        const chargesArrays = await Promise.all(chargesPromises);
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