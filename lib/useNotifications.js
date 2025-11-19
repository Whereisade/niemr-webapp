"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * usage:
 *   const {
 *     data,
 *     items,
 *     unreadCount,
 *     error,
 *     isLoading,
 *     mutate,
 *     markRead,
 *     markAllRead,
 *   } = useNotifications({ read: "false" });
 *
 * Backend endpoint: GET /api/notifications/items/
 * Query params:
 *   - read: "true" | "false" (optional)
 *   - topic: Topic enum string (optional)
 *   - since: ISO datetime string (optional)
 */
export function useNotifications(params = {}) {
  // Build stable query string
  const query = useMemo(() => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const str = String(value);
      if (!str.length) return;
      qs.set(key, str);
    });
    return qs.toString();
  }, [params]);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);

  const fetchNow = async (signal) => {
    setIsLoading(true);
    setError(null);
    try {
      const path = query
        ? `/notifications/items/?${query}`
        : "/notifications/items/";
      const json = await apiFetch(path, { signal });
      setData(json);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchNow(ctrl.signal);

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // SWR-style manual refresh
  const mutate = () => fetchNow(abortRef.current?.signal);

  // Normalize various possible shapes: [], {results: []}, {items: []}
  const items = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }, [data]);

  const unreadCount = useMemo(
    () => items.reduce((sum, n) => sum + (n.is_read ? 0 : 1), 0),
    [items]
  );

  // Mark a single notification as read (POST /notifications/items/:id/read/)
  const markRead = async (id) => {
    try {
      await apiFetch(`/notifications/items/${id}/read/`, {
        method: "POST",
      });

      // Optimistically update local cache
      setData((prev) => {
        if (!prev) return prev;

        const clone = Array.isArray(prev)
          ? [...prev]
          : {
              ...prev,
              results: Array.isArray(prev.results)
                ? [...prev.results]
                : prev.results,
            };

        const list = Array.isArray(clone)
          ? clone
          : Array.isArray(clone.results)
          ? clone.results
          : null;

        if (!list) return prev;

        const idx = list.findIndex((n) => String(n.id) === String(id));
        if (idx === -1) return prev;

        list[idx] = {
          ...list[idx],
          is_read: true,
          read_at: list[idx].read_at || new Date().toISOString(),
        };

        return clone;
      });
    } catch (err) {
      throw err;
    }
  };

  // Mark all unread as read (POST /notifications/items/read_all/)
  const markAllRead = async () => {
    try {
      await apiFetch("/notifications/items/read_all/", {
        method: "POST",
      });

      setData((prev) => {
        if (!prev) return prev;

        if (Array.isArray(prev)) {
          return prev.map((n) => ({
            ...n,
            is_read: true,
            read_at: n.read_at || new Date().toISOString(),
          }));
        }

        return {
          ...prev,
          results: Array.isArray(prev.results)
            ? prev.results.map((n) => ({
                ...n,
                is_read: true,
                read_at: n.read_at || new Date().toISOString(),
              }))
            : prev.results,
        };
      });
    } catch (err) {
      throw err;
    }
  };

  return {
    data,
    items,
    unreadCount,
    error,
    isLoading,
    mutate,
    markRead,
    markAllRead,
  };
}
