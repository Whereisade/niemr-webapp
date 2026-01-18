// lib/hmoStatusColors.js - UPDATED WITH TIER SUPPORT
// Utility functions for HMO relationship status and tier colors

import { Award, Star, TrendingUp, Shield } from "lucide-react";

/**
 * Get background and text colors for HMO relationship status badge
 * 
 * @param {string} status - HMO relationship status (EXCELLENT, GOOD, FAIR, POOR, BAD)
 * @returns {Object} - Object with bgColor, textColor, ringColor, and label
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
 * Get colors and styling for HMO tier badges
 * 
 * @param {string} tierLevel - Tier level (GOLD, SILVER, BRONZE)
 * @returns {Object} - Object with colors, icon, and label
 */
export function getTierColors(tierLevel) {
  const normalizedLevel = String(tierLevel || "").toUpperCase();
  
  const tierMap = {
    GOLD: {
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      ringColor: "ring-amber-300",
      borderColor: "border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      progressBg: "bg-gradient-to-r from-amber-400 to-yellow-500",
      label: "Gold",
      icon: <Award className="h-3.5 w-3.5" />,
    },
    SILVER: {
      bgColor: "bg-slate-50",
      textColor: "text-slate-700",
      ringColor: "ring-slate-300",
      borderColor: "border-slate-200",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      progressBg: "bg-gradient-to-r from-slate-400 to-slate-500",
      label: "Silver",
      icon: <Star className="h-3.5 w-3.5" />,
    },
    BRONZE: {
      bgColor: "bg-orange-50",
      textColor: "text-orange-700",
      ringColor: "ring-orange-300",
      borderColor: "border-orange-200",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      progressBg: "bg-gradient-to-r from-orange-400 to-amber-600",
      label: "Bronze",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
    }
  };
  
  return tierMap[normalizedLevel] || {
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    ringColor: "ring-slate-200",
    borderColor: "border-slate-200",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    progressBg: "bg-slate-400",
    label: tierLevel || "Standard",
    icon: <Shield className="h-3.5 w-3.5" />,
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

/**
 * Format tier display with colors and icon
 * 
 * @param {string} tierName - Tier name (e.g., "Gold Plan")
 * @param {string} tierLevel - Tier level (GOLD, SILVER, BRONZE)
 * @returns {Object} - Object with display text, colors, and icon
 */
export function formatTierDisplay(tierName, tierLevel) {
  const colors = getTierColors(tierLevel);
  
  return {
    name: tierName,
    level: tierLevel,
    ...colors
  };
}

/**
 * Get status color based on insurance status
 * 
 * @param {string} status - Insurance status (INSURED, SELF_PAY, PENDING)
 * @returns {Object} - Object with color classes
 */
export function getInsuranceStatusColors(status) {
  const normalizedStatus = String(status || "").toUpperCase();
  
  const statusMap = {
    INSURED: {
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-700",
      ringColor: "ring-emerald-200",
      label: "Insured"
    },
    SELF_PAY: {
      bgColor: "bg-slate-50",
      textColor: "text-slate-700",
      ringColor: "ring-slate-200",
      label: "Self Pay"
    },
    PENDING: {
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      ringColor: "ring-amber-200",
      label: "Pending"
    }
  };
  
  return statusMap[normalizedStatus] || {
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    ringColor: "ring-slate-200",
    label: status || "Unknown"
  };
}

/**
 * Calculate coverage display based on tier
 * 
 * @param {Object} tier - HMO tier object
 * @returns {Object} - Coverage display information
 */
export function getCoverageDisplay(tier) {
  if (!tier) {
    return {
      percentage: 0,
      display: "No Coverage",
      color: "text-slate-600"
    };
  }
  
  const percentage = tier.coverage_percentage || 0;
  
  return {
    percentage,
    display: `${percentage}% Coverage`,
    color: percentage >= 80 ? "text-emerald-600" : 
           percentage >= 50 ? "text-blue-600" : 
           "text-amber-600"
  };
}