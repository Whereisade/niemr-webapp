// app/provider/pharmacy/new/page.js
"use client";

import PrescriptionCreateForm from "@/components/pharmacy/PrescriptionCreateForm";

export default function ProviderNewPrescriptionPage() {
  return (
    <PrescriptionCreateForm
      title="Prescribe medication"
      subtitle="Create a prescription as an independent pharmacy provider."
      backHref="/provider/pharmacy"
      redirectTo="/provider/pharmacy"
    />
  );
}
