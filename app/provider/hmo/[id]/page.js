// app/(provider)/provider/hmo/[id]/page.js
// HMO Details - Independent Provider View
// Shows role-specific tabs for managing HMO pricing

import { requireIndependentProvider, authedFetchJSON } from "@/lib/serverAuth";
import { redirect, notFound } from "next/navigation";
import ProviderHMODetails from "./ProviderHMODetails";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `HMO Details | Provider`,
    description: "Manage HMO pricing and details",
  };
}

export default async function ProviderHMODetailsPage({ params }) {
  const { id } = await params;
  const { me, token } = await requireIndependentProvider();

  // Only certain roles can manage HMOs
  const role = (me?.role || "").toUpperCase();
  const allowedRoles = ["DOCTOR", "LAB", "PHARMACY"];
  
  if (!allowedRoles.includes(role)) {
    redirect("/provider");
  }

  // Fetch the HMO details
  const hmo = await authedFetchJSON(token, `/patients/hmo/facility/${id}/`);
  
  if (!hmo) {
    notFound();
  }

  // Ensure this HMO belongs to this provider (owner check)
  if (hmo.owner !== me.id) {
    redirect("/provider/hmo");
  }

  return <ProviderHMODetails hmo={hmo} user={me} token={token} />;
}