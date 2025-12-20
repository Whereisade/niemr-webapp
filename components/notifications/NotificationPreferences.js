// components/notifications/NotificationPreferences.js
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  Check,
  Loader2,
  AlertCircle,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  fetchPreferenceOptions,
  bulkUpdatePreferences,
  enableAllForChannel,
  disableAllForChannel,
} from "@/lib/notifications";

const CHANNEL_CONFIG = {
  IN_APP: {
    label: "In-App",
    icon: Bell,
    description: "Show in notification center",
  },
  EMAIL: {
    label: "Email",
    icon: Mail,
    description: "Send email notifications",
  },
  SMS: {
    label: "SMS",
    icon: Smartphone,
    description: "Send text messages",
  },
};

const TOPIC_GROUPS = {
  "Clinical": [
    "LAB_RESULT_READY",
    "LAB_RESULT_CRITICAL",
    "ALLERGY_ALERT",
    "VITAL_ALERT",
  ],
  "Appointments": [
    "APPOINTMENT_REMINDER",
    "APPOINTMENT_CANCELLED",
    "APPOINTMENT_RESCHEDULED",
    "APPOINTMENT_CONFIRMED",
  ],
  "Encounters": [
    "ENCOUNTER_CREATED",
    "ENCOUNTER_COMPLETED",
    "ENCOUNTER_UPDATED",
  ],
  "Pharmacy": [
    "PRESCRIPTION_READY",
    "PRESCRIPTION_REFILL",
  ],
  "Billing": [
    "BILLING",
    "PAYMENT_DUE",
    "PAYMENT_RECEIVED",
  ],
  "System": [
    "SYSTEM_ANNOUNCEMENT",
    "SYSTEM_MAINTENANCE",
    "ACCOUNT",
    "STAFF_ASSIGNED",
    "REMINDER",
    "MESSAGE",
  ],
};

/**
 * Notification preferences management component.
 *
 * Displays a matrix of topics × channels and allows toggling each preference.
 */
export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState({});
  const [topics, setTopics] = useState([]);
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // Load preferences
  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPreferenceOptions();

      // Extract topics and channels from response
      const topicList = data.topics || [];
      const channelList = data.channels || ["IN_APP", "EMAIL"];

      setTopics(topicList);
      setChannels(channelList);

      // Build preferences map: { "TOPIC:CHANNEL": enabled }
      const prefMap = {};
      if (Array.isArray(data.preferences)) {
        data.preferences.forEach((p) => {
          const key = `${p.topic}:${p.channel}`;
          prefMap[key] = p.enabled;
        });
      }
      setPreferences(prefMap);
    } catch (err) {
      console.error("Failed to load preferences:", err);
      setError("Failed to load notification preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Toggle a single preference
  const togglePreference = (topic, channel) => {
    const key = `${topic}:${channel}`;
    const currentValue = getPreferenceValue(topic, channel);
    const newValue = !currentValue;

    // Update local state optimistically
    setPreferences((prev) => ({
      ...prev,
      [key]: newValue,
    }));

    // Track pending change
    setPendingChanges((prev) => ({
      ...prev,
      [key]: { topic, channel, enabled: newValue },
    }));

    // Clear success message
    setSuccessMessage("");
  };

  // Get current preference value
  const getPreferenceValue = (topic, channel) => {
    const key = `${topic}:${channel}`;
    if (key in preferences) {
      return preferences[key];
    }
    // Default: IN_APP enabled, others disabled
    return channel === "IN_APP";
  };

  // Save pending changes
  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      const updates = Object.values(pendingChanges);
      await bulkUpdatePreferences(updates);

      setPendingChanges({});
      setSuccessMessage("Preferences saved successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save preferences:", err);
      setError("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Discard pending changes
  const discardChanges = () => {
    // Reload to reset state
    loadPreferences();
    setPendingChanges({});
    setSuccessMessage("");
  };

  // Enable all for a channel
  const handleEnableAll = async (channel) => {
    setIsSaving(true);
    try {
      await enableAllForChannel(channel);
      await loadPreferences();
      setPendingChanges({});
      setSuccessMessage(`All ${CHANNEL_CONFIG[channel]?.label || channel} notifications enabled!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(`Failed to enable ${channel} notifications.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Disable all for a channel
  const handleDisableAll = async (channel) => {
    setIsSaving(true);
    try {
      await disableAllForChannel(channel);
      await loadPreferences();
      setPendingChanges({});
      setSuccessMessage(`All ${CHANNEL_CONFIG[channel]?.label || channel} notifications disabled!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(`Failed to disable ${channel} notifications.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Group topics by category
  const groupedTopics = Object.entries(TOPIC_GROUPS).map(([group, topicKeys]) => ({
    group,
    topics: topicKeys.filter((t) =>
      topics.some((topic) => topic.value === t || topic === t)
    ),
  })).filter((g) => g.topics.length > 0);

  // Format topic for display
  const formatTopicLabel = (topicKey) => {
    const found = topics.find((t) => t.value === topicKey || t === topicKey);
    if (found?.label) return found.label;

    // Fallback: convert SNAKE_CASE to Title Case
    return topicKey
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Notification Preferences
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose how you want to receive different types of notifications.
          </p>
        </div>

        {/* Save/discard buttons */}
        {hasChanges && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-600">
              {Object.keys(pendingChanges).length} unsaved change(s)
            </span>
            <button
              type="button"
              onClick={discardChanges}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </button>
            <button
              type="button"
              onClick={saveChanges}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save changes
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Channel quick actions */}
      <div className="flex flex-wrap gap-3">
        {channels.filter((ch) => ch !== "PUSH").map((channel) => {
          const config = CHANNEL_CONFIG[channel] || { label: channel, icon: Bell };
          const Icon = config.icon;

          return (
            <div
              key={channel}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <Icon className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">{config.label}</span>
              <button
                type="button"
                onClick={() => handleEnableAll(channel)}
                disabled={isSaving}
                className="rounded px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50"
              >
                Enable all
              </button>
              <button
                type="button"
                onClick={() => handleDisableAll(channel)}
                disabled={isSaving}
                className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                Disable all
              </button>
            </div>
          );
        })}
      </div>

      {/* Preferences matrix */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Notification Type
                </th>
                {channels.filter((ch) => ch !== "PUSH").map((channel) => {
                  const config = CHANNEL_CONFIG[channel] || { label: channel, icon: Bell };
                  const Icon = config.icon;

                  return (
                    <th
                      key={channel}
                      className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Icon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedTopics.map(({ group, topics: groupTopics }) => (
                <>
                  {/* Group header */}
                  <tr key={group} className="bg-slate-50/50">
                    <td
                      colSpan={channels.length + 1}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {group}
                    </td>
                  </tr>

                  {/* Topics in group */}
                  {groupTopics.map((topicKey) => (
                    <tr key={topicKey} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatTopicLabel(topicKey)}
                      </td>
                      {channels.filter((ch) => ch !== "PUSH").map((channel) => {
                        const enabled = getPreferenceValue(topicKey, channel);
                        const key = `${topicKey}:${channel}`;
                        const isPending = key in pendingChanges;

                        return (
                          <td key={channel} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => togglePreference(topicKey, channel)}
                              disabled={isSaving}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                                enabled ? "bg-blue-600" : "bg-slate-200"
                              } ${isPending ? "ring-2 ring-amber-300" : ""}`}
                              role="switch"
                              aria-checked={enabled}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                  enabled ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}

              {/* Any remaining topics not in groups */}
              {topics
                .filter((t) => {
                  const key = t.value || t;
                  return !Object.values(TOPIC_GROUPS).flat().includes(key);
                })
                .map((topic) => {
                  const topicKey = topic.value || topic;
                  return (
                    <tr key={topicKey} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatTopicLabel(topicKey)}
                      </td>
                      {channels.filter((ch) => ch !== "PUSH").map((channel) => {
                        const enabled = getPreferenceValue(topicKey, channel);
                        const key = `${topicKey}:${channel}`;
                        const isPending = key in pendingChanges;

                        return (
                          <td key={channel} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => togglePreference(topicKey, channel)}
                              disabled={isSaving}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                                enabled ? "bg-blue-600" : "bg-slate-200"
                              } ${isPending ? "ring-2 ring-amber-300" : ""}`}
                              role="switch"
                              aria-checked={enabled}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                  enabled ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-slate-500">
        Changes are saved when you click "Save changes". In-app notifications are
        always displayed in the notification center. Email notifications may be
        delayed based on your quiet hours settings.
      </p>
    </div>
  );
}