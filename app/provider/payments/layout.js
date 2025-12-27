export const dynamic = "force-dynamic";

import { requireProviderRole } from "@/lib/serverAuth";

export default async function Layout({ children }) {
  // Independent billing is relevant for doctors, labs and pharmacists (outsourced work gets paid directly).
  await requireProviderRole(["DOCTOR", "LAB", "PHARMACY"]);
  return children;
}
