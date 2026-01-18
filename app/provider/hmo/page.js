// app/(provider)/provider/hmo/page.js
// Provider HMO Management - Main Page
// Server component that initializes data and renders client component

import { requireIndependentProvider } from "@/lib/serverAuth";
import { redirect } from "next/navigation";
import ProviderHMOPage from "./ProviderHMOPage";

export const metadata = {
  title: "HMO Management | Provider",
  description: "Manage HMO relationships and pricing for your services",
};

export default async function HMOPage() {
  // Require independent provider authentication
  const { me, token } = await requireIndependentProvider();

  // Only DOCTOR, LAB, PHARMACY can manage HMOs
  const role = (me?.role || "").toUpperCase();
  const allowedRoles = ["DOCTOR", "LAB", "PHARMACY"];
  
  if (!allowedRoles.includes(role)) {
    redirect("/provider");
  }

  // Pass user data to client component
  return <ProviderHMOPage user={me} />;
}