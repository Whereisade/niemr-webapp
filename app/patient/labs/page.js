// app/patient/labs/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import LabOrderDetailsModal from "@/components/labs/LabOrderDetailsModal";

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

export default function PatientLabsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOrderId, setDetailsOrderId] = useState(null);

  // simple paging via query params: ?page=1&limit=10
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");

  useEffect(() => {
    let cancelled = false;

    async function fetchLabs() {
      try {
        setLoading(true);
        setError("");
        // For now: reuse same endpoint as facility/provider.
        // Backend should scope to "current patient" automatically
        // when called as PATIENT role; if not, we can add &mine=true later.
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("limit", String(limit));

        const res = await apiFetch(`/labs/orders/?${qs.toString()}`);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        console.error("Failed to load patient lab orders", err);
        if (!cancelled) {
          setError(
            err?.message || "Failed to load lab orders. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLabs();
    return () => {
      cancelled = true;
    };
  }, [page, limit]);

  // normalize like facility/provider
  let rows = [];
  if (Array.isArray(data?.results)) {
    rows = data.results;
  } else if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object") {
    const numericKeys = Object.keys(data).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      rows = numericKeys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => data[k]);
    }
  }

  const hasNextPage = rows.length === limit; // simple heuristic
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

  return (
    <main className="mx-auto max-w-6xl p-6 md:p-10 space-y-6">
      <header className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
          My lab orders
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          View lab requests and their status. This is a read-only view.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ordered at
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tests
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    Loading lab orders…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-800">
                      {formatDateTime(order.ordered_at)}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {Array.isArray(order.items)
                        ? order.items
                            .map(
                              (i) =>
                                i.test?.name ||
                                i.test?.code ||
                                i.test_name ||
                                i.code
                            )
                            .join(", ")
                        : order.tests_display || "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {order.priority || "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      {order.status || "—"}
                    </td>
                    <td className="p-3 text-sm text-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailsOrderId(order.id);
                          setDetailsOpen(true);
                        }}
                        className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && !rows.length && !error && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-sm text-slate-500"
                  >
                    You don&apos;t have any lab orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* simple pager */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
          <span>
            Page {page} · Showing {rows.length} item
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

      <LabOrderDetailsModal
        orderId={detailsOrderId}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </main>
  );
}
