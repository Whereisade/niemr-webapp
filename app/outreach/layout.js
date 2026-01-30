import { requireOutreachUser } from "@/lib/serverAuth";

export const metadata = { title: "Outreach — NIEMR" };

export default async function OutreachLayout({ children }) {
  // Redirects if not authorized for Outreach workspace
  await requireOutreachUser();
  return <div className="min-h-[70vh]">{children}</div>;
}
