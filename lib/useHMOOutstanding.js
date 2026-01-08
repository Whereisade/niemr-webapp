// lib/useHMOOutstanding.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Fetch outstanding charges summary for an HMO
 * 
 * Usage:
 *  const { data, error, isLoading, mutate } = useHMOOutstanding(hmoId, {
 *    start: "2025-01-01",
 *    end: "2025-01-31"
 *  });
 * 
 * Returns:
 *  {
 *    summary: {
 *      total_charges,
 *      total_paid,
 *      total_outstanding,
 *      patient_count,
 *      charge_count
 *    },
 *    charges: [...]  // Array of charge objects
 *  }
 */
export function useHMOOutstanding(hmoId, params = {}, opts = {}) {
  const enabled = opts.enabled !== false && !!hmoId;

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("hmo", String(hmoId));
    
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) {
        qs.set(k, String(v));
      }
    });
    return qs.toString();
  }, [hmoId, JSON.stringify(params)]);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const fetchNow = async (signal) => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);

    try {
      // Use apiFetch (direct backend call) - matches pattern from useHMOFinancials
      const url = `/billing/charges/hmo-outstanding/?${query}`;
      const res = await apiFetch(url, { method: "GET" });
      setData(res);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.error("Error fetching HMO outstanding:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchNow(ctrl.signal);

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, enabled]);

  const mutate = () => {
    if (!enabled) return;
    return fetchNow(abortRef.current?.signal);
  };

  return { data, error, isLoading, mutate };
}