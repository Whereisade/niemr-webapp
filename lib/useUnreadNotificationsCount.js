// lib/useUnreadNotificationsCount.js
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Returns:
 *   { count, loading, error }
 *
 * We try to be defensive about shapes:
 *   - { count, results: [...] }
 *   - plain array [...]
 *   - weird numeric-key objects
 */
export function useUnreadNotificationsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams();
        // Backend is expected to filter by JWT user
        qs.set("is_read", "false");
        qs.set("limit", "1"); // we only care about the count; backend may still include it

        const res = await apiFetch(`/notifications/?${qs.toString()}`);

        if (cancelled) return;

        let newCount = 0;

        // Typical DRF paginated shape: { count, results: [...] }
        if (res && typeof res === "object" && typeof res.count === "number") {
          newCount = res.count;
        } else if (Array.isArray(res)) {
          newCount = res.length;
        } else if (res && typeof res === "object") {
          // numeric-key array-ish fallback
          const numericKeys = Object.keys(res).filter((k) =>
            /^\d+$/.test(k)
          );
          if (numericKeys.length) {
            newCount = numericKeys.length;
          }
        }

        setCount(newCount);
      } catch (err) {
        console.error("Failed to load unread notifications count", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load unread notifications count."
          );
          setCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { count, loading, error };
}
