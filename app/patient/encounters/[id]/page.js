// app/patient/encounters/[id]/page.js

import EncounterDetailClient from "./EncounterDetailClient";

async function fetchEncounter(id) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const res = await fetch(`${base}/api/bff/encounters/${id}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return { notFound: true };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Failed to fetch encounter", res.status, text);
    throw new Error("Failed to load encounter.");
  }

  const data = await res.json();
  return { notFound: false, data };
}

export default async function PatientEncounterDetailPage({ params }) {
  const encounterId = params?.id;
  if (!encounterId) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <p className="text-sm text-red-600">
          No encounter ID was provided in the URL.
        </p>
      </main>
    );
  }

  const result = await fetchEncounter(encounterId);

  if (result.notFound) {
    return (
      <main className="mx-auto max-w-4xl p-6 md:p-10">
        <h1 className="text-xl font-semibold text-slate-900">
          Encounter not found
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          We could not find an encounter with ID {encounterId}.
        </p>
      </main>
    );
  }

  return (
    <EncounterDetailClient encounter={result.data} encounterId={encounterId} />
  );
}
