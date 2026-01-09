// lib/hmoStatusColors.js
// Utility function to get HMO relationship status colors

/**
 * Get background and text colors for HMO relationship status badge
 * 
 * @param {string} status - HMO relationship status (EXCELLENT, GOOD, FAIR, POOR, BAD)
 * @returns {Object} - Object with bgColor and textColor classes
 */
export function getHMOStatusColors(status) {
  const normalizedStatus = String(status || "").toUpperCase();
  
  const colorMap = {
    EXCELLENT: {
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      ringColor: "ring-emerald-200",
      label: "Excellent"
    },
    GOOD: {
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      ringColor: "ring-blue-200",
      label: "Good"
    },
    FAIR: {
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      ringColor: "ring-yellow-200",
      label: "Fair"
    },
    POOR: {
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      ringColor: "ring-orange-200",
      label: "Poor"
    },
    BAD: {
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      ringColor: "ring-red-200",
      label: "Bad"
    }
  };
  
  return colorMap[normalizedStatus] || {
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    ringColor: "ring-slate-200",
    label: status || "—"
  };
}

/**
 * Format HMO display with relationship status colors
 * 
 * @param {string} hmoName - HMO name
 * @param {string} relationshipStatus - HMO relationship status
 * @returns {Object} - Object with display text and color classes
 */
export function formatHMODisplay(hmoName, relationshipStatus) {
  const colors = getHMOStatusColors(relationshipStatus);
  
  return {
    name: hmoName || "Self Pay",
    status: relationshipStatus,
    ...colors
  };
}