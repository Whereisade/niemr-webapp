export const dynamic = "force-dynamic";

import { requireIndependentProvider } from "@/lib/serverAuth";

export default async function ProviderLayout({ children }) {
  // Guard: must be logged in as an independent provider (no facility)
  await requireIndependentProvider();
  return children;
}
