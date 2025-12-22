"use client";

import NotificationPreferences from "@/components/notifications/NotificationPreferences";

export default function NotificationsSettingsPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Notification Settings</h1>
        <p className="text-sm text-gray-600">
          Choose what you want to receive in-app and by email.
        </p>
      </div>

      <NotificationPreferences />
    </div>
  );
}
