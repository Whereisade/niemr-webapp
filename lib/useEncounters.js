// lib/useEncounters.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function useEncounters(params = {}) {
  const query = useMemo(() => {
    const qs = new URLSearchParams();

    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;

      // pages often pass `search`, backend expects `s`
      const key = k === "search" ? "s" : k;

      // boolean -> 1/0
      if (typeof v === "boolean") {
        if (v) qs.set(key, "1");
        return;
      }

      const str = String(v);
      if (!str.length) return;
      qs.set(key, str);
    });

    return qs.toString();
  }, [JSON.stringify(params)]);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const fetchNow = async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/bff/encounters${query ? `?${query}` : ""}`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        signal,
        headers: { Accept: "application/json" },
      });

      const ct = res.headers.get("content-type") || "";
      const isJSON = ct.includes("application/json");
      const body = isJSON ? await res.json() : await res.text();

      if (!res.ok) {
        const msg =
          body?.detail ||
          (typeof body === "string" ? body : JSON.stringify(body)) ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setData(body);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchNow(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const mutate = () => fetchNow(abortRef.current?.signal);
  const key = `/api/bff/encounters?${query}`;

  // keep `loading` for older pages
  return { data, error, isLoading, loading: isLoading, mutate, key };
}
