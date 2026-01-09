"use client";

import { useState } from "react";
import {
  Heart,
  ThumbsUp,
  Meh,
  ThumbsDown,
  AlertTriangle,
  Edit2,
  Check,
  X,
  Clock,
  User,
  MessageSquare,
} from "lucide-react";

/**
 * Relationship Status Card Component
 * 
 * Displays and allows admins to update the HMO relationship status
 */
export default function RelationshipStatusCard({ hmo, onUpdate, isAdmin }) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(hmo?.relationship_status || "GOOD");
  const [notes, setNotes] = useState(hmo?.relationship_notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const statusConfig = {
    EXCELLENT: {
      label: "Excellent",
      icon: Heart,
      color: "emerald",
      bgClass: "bg-emerald-50",
      borderClass: "border-emerald-200",
      textClass: "text-emerald-700",
      iconClass: "text-emerald-600",
      badgeClass: "bg-emerald-100 text-emerald-700",
      description: "Strong partnership with prompt payments and great communication",
    },
    GOOD: {
      label: "Good",
      icon: ThumbsUp,
      color: "blue",
      bgClass: "bg-blue-50",
      borderClass: "border-blue-200",
      textClass: "text-blue-700",
      iconClass: "text-blue-600",
      badgeClass: "bg-blue-100 text-blue-700",
      description: "Healthy relationship with reliable payments and cooperation",
    },
    FAIR: {
      label: "Fair",
      icon: Meh,
      color: "yellow",
      bgClass: "bg-yellow-50",
      borderClass: "border-yellow-200",
      textClass: "text-yellow-700",
      iconClass: "text-yellow-600",
      badgeClass: "bg-yellow-100 text-yellow-700",
      description: "Average relationship with occasional payment delays",
    },
    POOR: {
      label: "Poor",
      icon: ThumbsDown,
      color: "orange",
      bgClass: "bg-orange-50",
      borderClass: "border-orange-200",
      textClass: "text-orange-700",
      iconClass: "text-orange-600",
      badgeClass: "bg-orange-100 text-orange-700",
      description: "Challenging relationship with frequent payment delays",
    },
    BAD: {
      label: "Bad",
      icon: AlertTriangle,
      color: "red",
      bgClass: "bg-red-50",
      borderClass: "border-red-200",
      textClass: "text-red-700",
      iconClass: "text-red-600",
      badgeClass: "bg-red-100 text-red-700",
      description: "Problematic relationship requiring immediate attention",
    },
  };

  const currentStatus = statusConfig[hmo?.relationship_status || "GOOD"];
  const StatusIcon = currentStatus.icon;

  const handleSave = async () => {
    if (!selectedStatus) {
      setError("Please select a status");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onUpdate({
        status: selectedStatus,
        notes: notes.trim(),
      });

      setIsEditing(false);
    } catch (err) {
      setError(err?.message || "Failed to update relationship status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus(hmo?.relationship_status || "GOOD");
    setNotes(hmo?.relationship_notes || "");
    setError("");
    setIsEditing(false);
  };

  if (!hmo) return null;

  return (
    <div className={`rounded-2xl border ${currentStatus.borderClass} ${currentStatus.bgClass} p-6 shadow-sm transition-all`}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-xl ${currentStatus.badgeClass}`}>
            <StatusIcon className={`h-6 w-6 ${currentStatus.iconClass}`} />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${currentStatus.textClass}`}>
              Relationship Status
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Track your working relationship with this HMO
            </p>
          </div>
        </div>

        {isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Update
          </button>
        )}
      </div>

      {/* Current Status Display */}
      {!isEditing ? (
        <div className="space-y-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Current Status:</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${currentStatus.badgeClass}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {currentStatus.label}
            </span>
          </div>

          {/* Status Description */}
          <p className="text-xs text-slate-600">
            {currentStatus.description}
          </p>

          {/* Notes */}
          {hmo.relationship_notes && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white/50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <MessageSquare className="h-3.5 w-3.5" />
                Notes
              </div>
              <p className="text-xs text-slate-700">{hmo.relationship_notes}</p>
            </div>
          )}

          {/* Last Updated Info */}
          {hmo.relationship_updated_at && (
            <div className="mt-3 flex items-center gap-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Last updated: {new Date(hmo.relationship_updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {hmo.relationship_updated_by_name && (
                <div className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {hmo.relationship_updated_by_name}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-4">
          {/* Status Selection */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700">
              Select Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              {Object.entries(statusConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = selectedStatus === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedStatus(key)}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition ${
                      isSelected
                        ? `${config.borderClass} ${config.bgClass} shadow-sm`
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? config.iconClass : "text-slate-400"}`} />
                    <span className={`text-xs font-semibold ${isSelected ? config.textClass : "text-slate-600"}`}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-700">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this status change..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              Provide context or reasons for this status
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !selectedStatus}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Status
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}