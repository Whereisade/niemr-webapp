// app/provider/notifications/page.js
"use client";

import FacilityAnnouncementsPanel from "@/components/notifications/FacilityAnnouncementsPanel";
import NotificationsPage from "@/components/notifications/NotificationsPage";

export default function FacilityNotificationsPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <FacilityAnnouncementsPanel />
      <NotificationsPage
        title="Notifications"
        subtitle="Clinical alerts and updates for the facility"
        showStats={true}
        showArchived={true}
        allowBatchActions={true}
        pollInterval={30000}
        defaultLimit={20}
      />
    </div>
  );
}