// lib/useAppointments.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * usage:
 *  const { data, error, isLoading, mutate } = useAppointments({ limit: 10, page: 1, mine: "true" })
 *  data?.results -> rows, data?.count -> total
 */
export function useAppointments(params = {}) {
  // Build a stable query string from params
  const query = useMemo(() => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) {
        qs.set(k, String(v));
      }
    });
    return qs.toString(); // e.g. "page=1&limit=10&date=today&mine=true"
  }, [JSON.stringify(params)]);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const fetchNow = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/bff/appointments${query ? `?${query}` : ""}`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include", // send cookies to the BFF
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
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchNow(ctrl.signal);

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // SWR-like "mutate" for manual refresh
  const mutate = () => fetchNow(abortRef.current?.signal);
  const key = `/api/bff/appointments?${query}`;

  return { data, error, isLoading, mutate, key };
}
