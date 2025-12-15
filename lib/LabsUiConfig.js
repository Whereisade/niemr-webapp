// lib/labsUiConfig.js

// Backend-native statuses → UI labels + badge styles
export const LAB_STATUS_META = {
  PENDING: {
    label: "Pending collection",
    badgeClass:
      "bg-amber-50 text-amber-800 ring-amber-200",
  },
  IN_PROGRESS: {
    label: "Sample collected",
    badgeClass:
      "bg-sky-50 text-sky-700 ring-sky-200",
  },
  COMPLETED: {
    label: "Reported",
    badgeClass:
      "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass:
      "bg-rose-50 text-rose-800 ring-rose-200",
  },
};

export function getLabStatusMeta(status) {
  const key = (status || "").toUpperCase();
  return (
    LAB_STATUS_META[key] || {
      label: status || "Unknown",
      badgeClass:
        "bg-slate-50 text-slate-600 ring-slate-200",
    }
  );
}
