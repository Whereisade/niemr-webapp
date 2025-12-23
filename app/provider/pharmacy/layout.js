export const dynamic = "force-dynamic";

import { requireProviderRole } from "@/lib/serverAuth";

export default async function ProviderPharmacyLayout({ children }) {
  // Doctors need access to view their prescriptions; pharmacists need full module access.
  await requireProviderRole(["PHARMACY", "DOCTOR"]);
  return children;
}
