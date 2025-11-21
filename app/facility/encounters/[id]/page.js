// app/facility/encounters/[id]/page.js
import { safeFetchJSON } from "@/lib/api";
import AttachmentList from "@/components/attachments/AttachmentList";

export default async function FacilityEncounterDetailPage({ params }) {
  const id = params.id;
  const encounter = await safeFetchJSON(`/encounters/${id}/`, null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Encounter #{encounter.id}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {encounter.patient_name || "Patient"} ·{" "}
          {encounter.encounter_type || encounter.type || "Encounter"}
        </p>
      </header>

      {/* your existing facility-level detail content here */}

      <AttachmentList
        refType="ENCOUNTER"
        refId={encounter.id}
        canUpload={true}   // facility staff can upload/remove
        className="mt-6"
      />
    </main>
  );
}
