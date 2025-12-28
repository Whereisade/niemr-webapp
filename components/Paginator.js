"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, Suspense } from "react";


export default function Paginator(props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <PaginatorInner {...props} />
    </Suspense>
  );
}

function PaginatorInner({ page = 1, total = 0, perPage = 10 }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Number(page || 1)), totalPages);

  const makeHref = (p) => {
    const params = new URLSearchParams(sp?.toString() || "");
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  };

  const pages = useMemo(() => {
    const arr = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(totalPages, current + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [current, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav className="mt-6 flex items-center justify-between gap-3">
      <button
        onClick={() => router.push(makeHref(Math.max(1, current - 1)))}
        disabled={current === 1}
        className={`rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 ${
          current === 1 ? "text-slate-400 bg-slate-50" : "bg-white hover:bg-slate-50"
        }`}
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => router.push(makeHref(p))}
            className={`rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 ${
              p === current ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <button
        onClick={() => router.push(makeHref(Math.min(totalPages, current + 1)))}
        disabled={current === totalPages}
        className={`rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 ${
          current === totalPages ? "text-slate-400 bg-slate-50" : "bg-white hover:bg-slate-50"
        }`}
      >
        Next
      </button>
    </nav>
  );
}
