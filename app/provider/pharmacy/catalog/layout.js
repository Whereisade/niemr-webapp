export const dynamic = "force-dynamic";

import { requireProviderRole } from "@/lib/serverAuth";

export default async function ProviderPharmacyOnlyLayout({ children }) {
  await requireProviderRole(["PHARMACY"]);
  return children;
}
