"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Calls backend (via Next proxy): GET /billing/charges/revenue_by_service/
 *
 * Params are forwarded as querystring, e.g.
 *  { patient: "123", start: "2025-01-01", end: "2025-01-31" }
 */
export function useRevenueByService(params = {}, opts = {}) {
  const enabled = opts.enabled !== false;

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) {
        qs.set(k, String(v));
      }
    });
    return qs.toString();
  }, [JSON.stringify(params || {})]);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const fetchNow = async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      const path = `/billing/charges/revenue_by_service/${query ? `?${query}` : ""}`;
      const res = await apiFetch(path, { method: "GET" });
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // apiFetch doesn't accept signal currently; keep simple
    fetchNow();

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, enabled]);

  const mutate = () => fetchNow();

  return { data, error, isLoading, mutate };
}
