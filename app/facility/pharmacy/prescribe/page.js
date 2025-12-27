// app/facility/pharmacy/prescribe/page.js
"use client";

import PrescriptionCreateForm from "@/components/pharmacy/PrescriptionCreateForm";

export default function FacilityPharmacyPrescribePage() {
  return (
    <PrescriptionCreateForm
      title="Create prescription"
      subtitle="Issue a new prescription as facility pharmacy staff. Select medications from your catalog or enter free-text."
      backHref="/facility/pharmacy"
      redirectTo="/facility/pharmacy"
    />
  );
}