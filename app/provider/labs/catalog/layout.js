export const dynamic = "force-dynamic";

import { requireProviderRole } from "@/lib/serverAuth";

export default async function ProviderLabsCatalogLayout({ children }) {
  await requireProviderRole(["LAB"]);
  return children;
}
