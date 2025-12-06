// components/encounters/EncounterRelatedData.js
"use client";

import Link from "next/link";

/**
 * Normalise encounter JSON fields into an array of IDs.
 * Supports:
 *  - null/undefined       -> []
 *  - [1, 2, "3"]          -> [1, 2, "3"]
 *  - "1" or 1             -> ["1"] / [1]
 */
function toIdArray(value) {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" || typeof v === "number" ? v : null))
      .filter((v) => v !== null);
  }
  if (typeof value === "string" || typeof value === "number") {
    return [value];
  }
  return [];
}

function uniqueIds(ids) {
  const seen = new Set();
  const out = [];
  ids.forEach((id) => {
    const key = String(id);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(id);
    }
  });
  return out;
}

function idChip({ id, href, labelPrefix = "#" }) {
  const content = (
    <span className="text-[11px] font-medium text-slate-700">
      {labelPrefix}
      {String(id)}
    </span>
  );

  if (href) {
    return (
      <Link
        key={String(id)}
        href={href}
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:border-blue-400 hover:text-blue-700"
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      key={String(id)}
      className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
    >
      {content}
    </span>
  );
}

/**
 * EncounterRelatedData
 *
 * Renders a compact summary of lab orders, imaging requests and prescriptions
 * linked to an encounter using:
 *   - encounter.lab_order_ids
 *   - encounter.imaging_request_ids
 *   - encounter.prescription_ids
 *
 * `context` controls where links should point:
 *  - "facility" -> /facility/labs/[id],   /facility/imaging/[id]
 *  - "patient"  -> /patient/labs/[id],    /patient/imaging/[id]
 *  - "provider" -> just chips (no detail routes yet)
 */
export default function EncounterRelatedData({
  encounter,
  context = "provider",
  className = "",
}) {
  if (!encounter) return null;

  const labIds = uniqueIds(toIdArray(encounter.lab_order_ids));
  const imagingIds = uniqueIds(toIdArray(encounter.imaging_request_ids));
  const prescriptionIds = uniqueIds(toIdArray(encounter.prescription_ids));

  const hasAny = labIds.length || imagingIds.length || prescriptionIds.length;

  const makeLabHref = (id) => {
    const sid = String(id);
    if (context === "facility") return `/facility/labs/${sid}`;
    if (context === "patient") return `/patient/labs/${sid}`;
    // Provider: no dedicated lab detail page yet
    return null;
  };

  const makeImagingHref = (id) => {
    const sid = String(id);
    if (context === "facility") return `/facility/imaging/${sid}`;
    if (context === "patient") return `/patient/imaging/${sid}`;
    // Provider: no dedicated imaging detail page yet
    return null;
  };

  const sectionClasses =
    "rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm " +
    className;

  if (!hasAny) {
    return (
      <section className={sectionClasses}>
        <h2 className="text-sm font-semibold text-slate-900 mb-1">
          Related data
        </h2>
        <p className="text-xs text-slate-600">
          No lab tests, imaging requests or prescriptions are linked to this
          encounter yet.
        </p>
      </section>
    );
  }

  return (
    <section className={sectionClasses}>
      <h2 className="text-sm font-semibold text-slate-900 mb-2">
        Related data
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Orders and prescriptions that were recorded as part of this visit.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {labIds.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lab orders
            </p>
            <div className="flex flex-wrap gap-1.5">
              {labIds.map((id) => idChip({ id, href: makeLabHref(id) }))}
            </div>
          </div>
        )}

        {imagingIds.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Imaging requests
            </p>
            <div className="flex flex-wrap gap-1.5">
              {imagingIds.map((id) =>
                idChip({ id, href: makeImagingHref(id) })
              )}
            </div>
          </div>
        )}

        {prescriptionIds.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Prescriptions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {prescriptionIds.map((id) =>
                idChip({ id, href: null, labelPrefix: "Rx #" })
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              View full prescription details from the pharmacy tab.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
