// lib/useOutreachSession.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeList } from "@/lib/outreachApi";

const STORAGE_KEY = "niemr_outreach_event_id";

function safeGetStoredEventId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSetStoredEventId(id) {
  try {
    if (!id) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // ignore
  }
}

export function useOutreachSession({ preferEventId } = {}) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [isOutreachSuperAdmin, setIsOutreachSuperAdmin] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(preferEventId || null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeProfile, setActiveProfile] = useState(null);
  const [error, setError] = useState("");

  // bootstrap: me + my-event
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setError("");
      try {
        const meData = await apiFetch("/accounts/me/");
        if (cancelled) return;
        setMe(meData || null);

        // Outreach context
        const myEvent = await apiFetch("/outreach/my-event/");
        if (cancelled) return;

        const a = Array.isArray(myEvent?.assignments) ? myEvent.assignments : [];
        setAssignments(a);

        // Super admin case returns {detail: "..."}
        const isSA = !a.length;
        setIsOutreachSuperAdmin(isSA && String(meData?.role || "").toUpperCase() === "SUPER_ADMIN");

        // Decide event id
        const stored = safeGetStoredEventId();
        const preferred = preferEventId || stored || null;

        let nextEventId = null;
        let nextProfile = null;

        if (a.length === 1) {
          nextEventId = a[0]?.event?.id;
          nextProfile = a[0] || null;
        } else if (a.length > 1) {
          // honor preferred if available
          const match = preferred ? a.find((x) => String(x?.event?.id) === String(preferred)) : null;
          nextEventId = match?.event?.id || a[0]?.event?.id || null;
          nextProfile = match || a[0] || null;
        } else {
          // super admin: prefer stored selection, if any
          nextEventId = preferred || null;
        }

        if (nextEventId) {
          safeSetStoredEventId(nextEventId);
        }

        setSelectedEventId(nextEventId);
        setActiveProfile(nextProfile);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Failed to load outreach session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [preferEventId]);

  // Load selected event details for super admin (staff already includes event blob)
  useEffect(() => {
    let cancelled = false;

    async function loadSelectedEvent() {
      if (!selectedEventId) {
        setSelectedEvent(null);
        return;
      }

      // staff: event data already in assignment
      if (activeProfile?.event?.id && String(activeProfile.event.id) === String(selectedEventId)) {
        setSelectedEvent(activeProfile.event);
        return;
      }

      // super admin: fetch full event
      if (isOutreachSuperAdmin) {
        try {
          const evt = await apiFetch(`/outreach/events/${selectedEventId}/`);
          if (!cancelled) setSelectedEvent(evt);
        } catch (e) {
          console.error(e);
          if (!cancelled) setSelectedEvent(null);
        }
      }
    }

    loadSelectedEvent();
    return () => {
      cancelled = true;
    };
  }, [selectedEventId, activeProfile, isOutreachSuperAdmin]);

  const permissions = useMemo(() => {
    if (isOutreachSuperAdmin) {
      // super admin can do everything in outreach module
      return ["*"];
    }
    return Array.isArray(activeProfile?.permissions) ? activeProfile.permissions : [];
  }, [activeProfile, isOutreachSuperAdmin]);

  const sites = useMemo(() => normalizeList(selectedEvent?.sites) || [], [selectedEvent]);

  function switchEvent(nextId) {
    const id = nextId ? String(nextId) : null;
    setSelectedEventId(id);
    safeSetStoredEventId(id);
    if (assignments?.length) {
      const match = assignments.find((x) => String(x?.event?.id) === String(id));
      setActiveProfile(match || null);
      setSelectedEvent(match?.event || null);
    }
  }

  return {
    loading,
    error,
    me,
    assignments,
    isOutreachSuperAdmin,
    selectedEventId,
    selectedEvent,
    sites,
    activeProfile,
    permissions,
    switchEvent,
  };
}
