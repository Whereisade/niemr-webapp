// lib/useAppointments.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function useAppointments(params = {}) {
  const query = useMemo(() => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) {
        qs.set(k, String(v));
      }
    });
    return qs.toString();
  }, [params]);

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

      // 🔧 NEW: normalize the weird BFF wrapper when backend returns a list
      let normalized = body;

      if (
        normalized &&
        typeof normalized === "object" &&
        !Array.isArray(normalized) &&
        !Array.isArray(normalized.results) &&
        // detect "array turned into object with numeric keys"
        Object.keys(normalized).some((k) => /^\d+$/.test(k))
      ) {
        normalized = Object.keys(normalized)
          .filter((k) => /^\d+$/.test(k))
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => normalized[k]);
      }

      setData(normalized);
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

  const mutate = () => fetchNow(abortRef.current?.signal);
  const key = `/api/bff/appointments?${query}`;

  return { data, error, isLoading, mutate, key };
}
