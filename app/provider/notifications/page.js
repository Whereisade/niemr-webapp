// app/provider/notifications/page.js
"use client";

import NotificationsPage from "@/components/notifications/NotificationsPage";

export default function ProviderNotificationsPage() {
  return (
    <NotificationsPage
      title="Notifications"
      subtitle="Clinical alerts and updates for your practice"
      showStats={true}
      showArchived={true}
      allowBatchActions={true}
      pollInterval={30000}
      defaultLimit={20}
    />
  );
}