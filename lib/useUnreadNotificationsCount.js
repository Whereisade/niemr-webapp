// lib/useUnreadNotificationsCount.js
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchUnreadCount } from "@/lib/notifications";

/**
 * Hook to fetch unread notifications count.
 * 
 * Returns:
 *   { count, urgentCount, loading, error, mutate }
 *
 * This is a compatibility wrapper that works with both the old and new API formats.
 */
export function useUnreadNotificationsCount(pollInterval = 30000) {
  const [count, setCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetchUnreadCount();

      // Handle new API format: { count, urgent_count }
      if (res && typeof res === "object") {
        if (typeof res.count === "number") {
          setCount(res.count);
        }
        if (typeof res.urgent_count === "number") {
          setUrgentCount(res.urgent_count);
        }
      }
    } catch (err) {
      console.error("Failed to load unread notifications count", err);
      setError(err?.message || "Failed to load unread notifications count.");
      setCount(0);
      setUrgentCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Set up polling
    if (pollInterval > 0) {
      pollRef.current = setInterval(load, pollInterval);
      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
        }
      };
    }
  }, [load, pollInterval]);

  const mutate = useCallback(() => {
    load();
  }, [load]);

  return { count, urgentCount, loading, error, mutate };
}

// Default export for backward compatibility
export default useUnreadNotificationsCount;