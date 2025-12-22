"use client";

import NotificationsPage from "@/components/notifications/NotificationsPage";

export default function NotificationsRootPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <NotificationsPage
        title="Notifications"
        subtitle="Your recent in-app alerts and updates."
      />
    </div>
  );
}
