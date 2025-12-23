export const dynamic = "force-dynamic";

import { requireProviderRole } from "@/lib/serverAuth";

export default async function Layout({ children }) {
  // Nurses/doctors can order labs; lab users handle collection/results in the Labs module.
  await requireProviderRole(["DOCTOR", "NURSE"]);
  return children;
}
