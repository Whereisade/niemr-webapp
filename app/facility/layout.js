// app/facility/layout.js
// Server layout guard for the entire facility workspace.

import { requireFacilityStaff } from "@/lib/serverAuth";

export default async function FacilityLayout({ children }) {
  // Redirects automatically if not authorized.
  await requireFacilityStaff();

  return <>{children}</>;
}
