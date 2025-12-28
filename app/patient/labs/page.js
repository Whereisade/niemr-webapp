// app/patient/labs/page.js
"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getLabStatusMeta } from "@/lib/LabsUiConfig";


export default function PatientLabOrdersPage(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <PatientLabOrdersPageInner {...props} />
    </Suspense>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizeLabOrdersPayload(body) {
  if (!body) return [];

  // DRF paginated: { count, results: [...] }
  if (Array.isArray(body.results)) {
    return body.results;
  }

  // Plain list: [...]
  if (Array.isArray(body)) {
    return body;
  }

  // Weird numeric-key object from BFF spread
  if (body && typeof body === "object") {
    const numericKeys = Object.keys(body).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      return numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => body[k]);
    }
  }

  return [];
}

function PatientLabOrdersPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");
  const status = searchParams.get("status") || "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));
        qs.set("mine", "true"); // scope to this patient if backend honours it
        if (status) qs.set("status", status);

        const body = await apiFetch(`/labs/orders/?${qs.toString()}`, {
          method: "GET",
        });

        if (cancelled) return;

        setData(body);
        const items = normalizeLabOrdersPayload(body);
        setRows(items);
      } catch (err) {
        console.error("Failed to load patient lab orders", err);
        if (!cancelled) {
          setError(
            err?.message ||
              "Failed to load lab orders. Please try again."
          );
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, limit, status]);

  const hasNextPage = rows.length === limit;
  const hasPrevPage = page > 1;

  function goToPage(nextPage) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextPage && nextPage > 1) {
      sp.set("page", String(nextPage));
    } else {
      sp.delete("page");
    }
    router.push(`/patient/labs?${sp.toString()}`);
  }

  function applyStatusFilter(nextStatus) {
    const sp = new URLSearchParams(searchParams.toString());
    if (nextStatus) {
      sp.set("status", nextStatus);
    } else {
      sp.delete("status");
    }
    sp.delete("page");
    router.push(`/patient/labs?${sp.toString()}`);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            My lab tests
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View lab tests that have been ordered for you, including their
            status and when results were reported.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => applyStatusFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending collection</option>
            <option value="IN_PROGRESS">Sample collected</option>
            <option value="COMPLETED">Reported</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ordered at
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tests
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Facility
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ordered by
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Note
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    Loading lab orders…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((order) => {
                  const testsText = Array.isArray(order.items)
                    ? order.items
                        .map(
                          (i) =>
                            i.test?.name ||
                            i.test?.code ||
                            i.test_name ||
                            i.code
                        )
                        .join(", ")
                    : order.tests_display || "—";

                  const facilityName =
                    order.facility_name || order.facility?.name || "—";

                  const orderedByName =
                    order.ordered_by_name ||
                    (order.ordered_by_first_name ||
                    order.ordered_by_last_name
                      ? `${order.ordered_by_first_name || ""} ${
                          order.ordered_by_last_name || ""
                        }`.trim()
                      : "") ||
                    order.ordered_by ||
                    "—";

                  const { label, badgeClass } = getLabStatusMeta(order.status);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="p-3 text-xs text-slate-800">
                        {formatDateTime(order.ordered_at || order.created_at)}
                      </td>
                      <td className="p-3 text-sm text-slate-800">
                        {testsText}
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        {(() => (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
                          >
                            {label}
                          </span>
                        ))()}
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        {facilityName}
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        {orderedByName}
                      </td>
                      <td className="p-3 text-xs text-slate-800">
                        <span className="line-clamp-2">
                          {order.note || "—"}
                        </span>
                      </td>
                      <td className="p-3 text-right text-xs">
                        <Link
                          href={`/patient/labs/${order.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !rows.length && !error && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    No lab tests found for your account yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} lab order
            {rows.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={!hasPrevPage}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={!hasNextPage}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
