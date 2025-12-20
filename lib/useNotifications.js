// lib/useNotifications.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchNotifications,
  fetchUnreadCount,
  fetchRecentNotifications,
  fetchNotificationStats,
  markNotificationRead,
  markNotificationUnread,
  archiveNotification,
  unarchiveNotification,
  markAllNotificationsRead,
  archiveAllReadNotifications,
  batchMarkRead,
  batchArchive,
  batchDelete,
} from "@/lib/notifications";

/**
 * Normalize backend response to array of items.
 * Handles paginated { results: [...] }, plain arrays, and numeric-key objects.
 */
function normalizeItems(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.items)) return res.items;

  // Handle weird numeric-key objects from BFF
  if (typeof res === "object") {
    const numericKeys = Object.keys(res).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => res[k]);
    }
  }

  return [];
}

/**
 * Main notifications hook with filtering, pagination, and actions.
 *
 * @param {Object} params - Query parameters for filtering
 * @param {boolean|null} params.read - Filter by read status
 * @param {boolean} params.archived - Show archived
 * @param {string} params.priority - Filter by priority
 * @param {string} params.topic - Filter by topic
 * @param {string} params.search - Search query
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {Object} options - Hook options
 * @param {number} options.pollInterval - Polling interval in ms (0 to disable)
 * @param {boolean} options.fetchStats - Also fetch stats
 */
export function useNotifications(params = {}, options = {}) {
  const { pollInterval = 0, fetchStats: shouldFetchStats = false } = options;

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [stats, setStats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const abortRef = useRef(null);
  const pollRef = useRef(null);

  // Memoize params to prevent unnecessary re-fetches
  const queryKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(
    async (signal) => {
      setIsLoading(true);
      setError(null);

      try {
        const [notifRes, countRes, statsRes] = await Promise.all([
          fetchNotifications(params),
          fetchUnreadCount().catch(() => ({ count: 0, urgent_count: 0 })),
          shouldFetchStats
            ? fetchNotificationStats().catch(() => null)
            : Promise.resolve(null),
        ]);

        if (signal?.aborted) return;

        const normalized = normalizeItems(notifRes);
        setItems(normalized);
        setPagination({
          count: notifRes?.count || normalized.length,
          next: notifRes?.next || null,
          previous: notifRes?.previous || null,
        });

        setUnreadCount(countRes?.count ?? 0);
        setUrgentCount(countRes?.urgent_count ?? 0);

        if (statsRes) {
          setStats(statsRes);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Failed to load notifications:", err);
        setError(err);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [queryKey, shouldFetchStats]
  );

  // Initial fetch and re-fetch on params change
  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchData(ctrl.signal);

    return () => ctrl.abort();
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0) return;

    pollRef.current = setInterval(() => {
      fetchData(abortRef.current?.signal);
    }, pollInterval);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [pollInterval, fetchData]);

  // Optimistic update helper
  const updateItemOptimistic = useCallback((id, updates) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  // Actions
  const markRead = useCallback(
    async (id) => {
      updateItemOptimistic(id, { is_read: true, read_at: new Date().toISOString() });
      setUnreadCount((c) => Math.max(0, c - 1));

      try {
        await markNotificationRead(id);
      } catch (err) {
        // Revert on error
        updateItemOptimistic(id, { is_read: false, read_at: null });
        setUnreadCount((c) => c + 1);
        throw err;
      }
    },
    [updateItemOptimistic]
  );

  const markUnread = useCallback(
    async (id) => {
      updateItemOptimistic(id, { is_read: false, read_at: null });
      setUnreadCount((c) => c + 1);

      try {
        await markNotificationUnread(id);
      } catch (err) {
        updateItemOptimistic(id, { is_read: true });
        setUnreadCount((c) => Math.max(0, c - 1));
        throw err;
      }
    },
    [updateItemOptimistic]
  );

  const archive = useCallback(
    async (id) => {
      const originalItems = items;
      setItems((prev) => prev.filter((item) => item.id !== id));

      try {
        await archiveNotification(id);
      } catch (err) {
        setItems(originalItems);
        throw err;
      }
    },
    [items]
  );

  const unarchive = useCallback(
    async (id) => {
      try {
        await unarchiveNotification(id);
        // Refresh to get the item back
        fetchData(abortRef.current?.signal);
      } catch (err) {
        throw err;
      }
    },
    [fetchData]
  );

  const markAllRead = useCallback(async () => {
    const originalItems = items;
    const originalCount = unreadCount;

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        is_read: true,
        read_at: item.read_at || new Date().toISOString(),
      }))
    );
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      setItems(originalItems);
      setUnreadCount(originalCount);
      throw err;
    }
  }, [items, unreadCount]);

  const archiveAllRead = useCallback(async () => {
    const originalItems = items;

    setItems((prev) => prev.filter((item) => !item.is_read));

    try {
      await archiveAllReadNotifications();
    } catch (err) {
      setItems(originalItems);
      throw err;
    }
  }, [items]);

  const batchRead = useCallback(
    async (ids) => {
      const originalItems = items;
      const affectedCount = items.filter(
        (item) => ids.includes(item.id) && !item.is_read
      ).length;

      setItems((prev) =>
        prev.map((item) =>
          ids.includes(item.id)
            ? { ...item, is_read: true, read_at: item.read_at || new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((c) => Math.max(0, c - affectedCount));

      try {
        await batchMarkRead(ids);
      } catch (err) {
        setItems(originalItems);
        setUnreadCount((c) => c + affectedCount);
        throw err;
      }
    },
    [items]
  );

  const batchArchiveItems = useCallback(
    async (ids) => {
      const originalItems = items;

      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));

      try {
        await batchArchive(ids);
      } catch (err) {
        setItems(originalItems);
        throw err;
      }
    },
    [items]
  );

  const batchDeleteItems = useCallback(
    async (ids) => {
      const originalItems = items;

      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));

      try {
        await batchDelete(ids);
      } catch (err) {
        setItems(originalItems);
        throw err;
      }
    },
    [items]
  );

  const mutate = useCallback(() => {
    fetchData(abortRef.current?.signal);
  }, [fetchData]);

  return {
    // Data
    items,
    pagination,
    stats,
    unreadCount,
    urgentCount,
    error,
    isLoading,

    // Actions
    markRead,
    markUnread,
    archive,
    unarchive,
    markAllRead,
    archiveAllRead,
    batchRead,
    batchArchive: batchArchiveItems,
    batchDelete: batchDeleteItems,
    mutate,
  };
}

/**
 * Lightweight hook for unread count (for bell badge).
 * @param {number} pollInterval - Polling interval in ms (default: 30000)
 */
export function useUnreadCount(pollInterval = 30000) {
  const [count, setCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const pollRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetchUnreadCount();
      setCount(res?.count ?? 0);
      setUrgentCount(res?.urgent_count ?? 0);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    if (pollInterval > 0) {
      pollRef.current = setInterval(fetchCount, pollInterval);
      return () => clearInterval(pollRef.current);
    }
  }, [fetchCount, pollInterval]);

  const mutate = useCallback(() => {
    fetchCount();
  }, [fetchCount]);

  return { count, urgentCount, isLoading, error, mutate };
}

/**
 * Hook for recent notifications (for dropdown preview).
 * @param {number} limit - Number of items to fetch
 * @param {number} pollInterval - Polling interval in ms
 */
export function useRecentNotifications(limit = 5, pollInterval = 30000) {
  const [items, setItems] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const pollRef = useRef(null);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetchRecentNotifications(limit);
      setItems(normalizeItems(res?.items || res));
      setTotalUnread(res?.total_unread ?? 0);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch recent notifications:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecent();

    if (pollInterval > 0) {
      pollRef.current = setInterval(fetchRecent, pollInterval);
      return () => clearInterval(pollRef.current);
    }
  }, [fetchRecent, pollInterval]);

  const markRead = useCallback(async (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, is_read: true, read_at: new Date().toISOString() }
          : item
      )
    );
    setTotalUnread((c) => Math.max(0, c - 1));

    try {
      await markNotificationRead(id);
    } catch (err) {
      // Refresh on error
      fetchRecent();
      throw err;
    }
  }, [fetchRecent]);

  const mutate = useCallback(() => {
    fetchRecent();
  }, [fetchRecent]);

  return { items, totalUnread, isLoading, error, markRead, mutate };
}

/**
 * Hook for notification stats.
 * @param {number} pollInterval - Polling interval in ms
 */
export function useNotificationStats(pollInterval = 60000) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const pollRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetchNotificationStats();
      setStats(res);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch notification stats:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (pollInterval > 0) {
      pollRef.current = setInterval(fetchData, pollInterval);
      return () => clearInterval(pollRef.current);
    }
  }, [fetchData, pollInterval]);

  const mutate = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { stats, isLoading, error, mutate };
}