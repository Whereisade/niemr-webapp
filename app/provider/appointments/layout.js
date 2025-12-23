export const dynamic = "force-dynamic";

import { requireProviderRole } from "@/lib/serverAuth";

export default async function Layout({ children }) {
  await requireProviderRole(["DOCTOR", "NURSE"]);
  return children;
}
