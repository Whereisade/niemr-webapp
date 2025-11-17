// lib/useBillingLedger.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * usage:
 *  const { data, error, isLoading, mutate } = useBillingLedger(
 *    { patient: "123" },       // params (optional for PATIENT role)
 *    { enabled: true }         // optional
 *  );
 *
 *  data:
 *    {
 *      patient_id,
 *      charges_total,    // or "charges...al" from backend
 *      payments_total,
 *      balance
 *    }
 */
export function useBillingLedger(params = {}, opts = {}) {
  const enabled = opts.enabled !== false; // default: enabled

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

  const fetchNow = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/bff/billing/ledger${query ? `?${query}` : ""}`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        signal,
        headers: {
          Accept: "application/json",
        },
      });

      const ct = res.headers.get("content-type") || "";
      const isJSON = ct.includes("application/json");
      const body = isJSON ? await res.json() : await res.text();

      if (!res.ok) {
        let msg =
          body?.detail ||
          (typeof body === "string" ? body : JSON.stringify(body)) ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setData(body);
    } catch (err) {
      if (err && err.name === "AbortError") return;
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
      if (abortRef.current) {
        abortRef.current.abort();
      }
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

  const key = enabled ? `/api/bff/billing/ledger?${query}` : null;

  return { data, error, isLoading, mutate, key };
}
