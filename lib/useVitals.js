// lib/useVitals.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

export function useVitals(params = {}) {
  const query = useMemo(() => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) {
        qs.set(k, String(v));
      }
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
      // 🔧 FIXED: Use the Django API endpoint directly via apiFetch
      const url = `/vitals/${query ? `?${query}` : ""}`;

      console.log("🔍 Fetching vitals from:", url);
      console.log("📋 Params:", params);

      const body = await apiFetch(url, {
        method: "GET",
        signal,
      });

      console.log("✅ Vitals response:", body);
      console.log("📊 Results count:", body?.results?.length || body?.length || 0);
      console.log("🔢 Total count:", body?.count);

      if (signal.aborted) return;
      setData(body);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.error("❌ Failed to fetch vitals:", err);
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
  const key = `/vitals/?${query}`;

  return { data, error, isLoading, mutate, key };
}