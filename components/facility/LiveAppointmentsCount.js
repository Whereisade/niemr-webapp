"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Live-updating appointment count for dashboard stat cards.
 * Uses backend: GET /api/appointments/summary/?date=today
 *
 * Note: Backend does not enable DRF pagination globally, so list endpoints can be arrays.
 * The summary endpoint avoids fetching full lists just to compute counts.
 */
export default function LiveAppointmentsCount({
  initialCount = 0,
  date = "today",
  pollInterval = 20000,
}) {
  const [count, setCount] = useState(
    typeof initialCount === "number" ? initialCount : 0
  );
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (date) qs.set("date", date);

      const res = await apiFetch(`/appointments/summary/?${qs.toString()}`);
      const next =
        typeof res?.total === "number"
          ? res.total
          : typeof res?.count === "number"
          ? res.count
          : null;

      if (next !== null) setCount(next);
    } catch {
      // Silent fail (dashboard should remain usable)
    }
  }, [date]);

  useEffect(() => {
    load();

    if (pollInterval > 0) {
      pollRef.current = setInterval(load, pollInterval);
      return () => clearInterval(pollRef.current);
    }
  }, [load, pollInterval]);

  return <>{count}</>;
}
