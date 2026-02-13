"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, HelpCircle, ArrowLeft, Sparkles } from "lucide-react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeStr(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function renderAnswer(answer) {
  // Supports:
  // - string with paragraphs separated by blank lines
  // - simple bullets lines starting with "- "
  // - array of strings (paragraphs)
  const parts = Array.isArray(answer)
    ? answer
    : String(answer || "")
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

  return parts.map((p, idx) => {
    const lines = p.split("\n").map((l) => l.trim());
    const bullets = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
    const nonBullets = lines.filter((l) => !l.startsWith("- ")).join(" ").trim();

    return (
      <div key={idx} className="space-y-2">
        {nonBullets ? <p className="text-sm leading-6 text-slate-700">{nonBullets}</p> : null}
        {bullets.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {bullets.map((b, i) => (
              <li key={i} className="leading-6">
                {b}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  });
}

export default function FAQClient({
  title,
  subtitle,
  portalLabel,
  backHref,
  roleLabel,
  categories = [],
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const normalizedQuery = normalizeStr(query);

  const normalized = useMemo(() => {
    const cats = Array.isArray(categories) ? categories : [];
    return cats
      .filter((c) => c && Array.isArray(c.items))
      .map((c) => ({
        ...c,
        id: c.id || normalizeStr(c.title || "category"),
      }));
  }, [categories]);

  const filtered = useMemo(() => {
    let cats = normalized;
    if (activeCategory !== "all") {
      cats = cats.filter((c) => c.id === activeCategory);
    }

    if (!normalizedQuery) return cats;

    return cats
      .map((c) => {
        const items = (c.items || []).filter((it) => {
          const hay = normalizeStr(
            `${it?.question || ""} ${it?.answer || ""} ${(it?.tags || []).join(" ")}`
          );
          return hay.includes(normalizedQuery);
        });
        return { ...c, items };
      })
      .filter((c) => (c.items || []).length > 0);
  }, [normalized, normalizedQuery, activeCategory]);

  const allCount = useMemo(() => {
    return normalized.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  }, [normalized]);

  const visibleCount = useMemo(() => {
    return filtered.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  }, [filtered]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-100/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-10">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white/95 p-5 shadow-md shadow-blue-500/10 ring-1 ring-slate-200 md:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800 hover:bg-slate-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Link>
                {portalLabel ? (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                    {portalLabel}
                  </span>
                ) : null}
                {roleLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {roleLabel}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                    {title}
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:items-center">
              <div className="relative w-full md:w-[360px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions…"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600 md:justify-end">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                  Showing <span className="font-semibold text-slate-900">{visibleCount}</span>
                  {normalizedQuery ? " match" : ""}
                  {visibleCount === 1 ? "" : "es"}
                  {normalizedQuery ? ` of ${allCount}` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cx(
              "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
              activeCategory === "all"
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
            )}
          >
            All
          </button>
          {normalized.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={cx(
                "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
                activeCategory === c.id
                  ? "bg-blue-600 text-white ring-blue-600"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              )}
              title={c.description || c.title}
            >
              {c.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5">
          {filtered.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-3 text-base font-semibold text-slate-900">
                No results
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Try a different keyword, or switch to “All”.
              </p>
              <button
                type="button"
                className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => {
                  setQuery("");
                  setActiveCategory("all");
                }}
              >
                Reset
              </button>
            </div>
          ) : (
            filtered.map((cat) => (
              <section
                key={cat.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {cat.title}
                      </h2>
                      {cat.description ? (
                        <p className="mt-1 text-xs text-slate-600">{cat.description}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                      {cat.items.length}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {cat.items.map((it, idx) => (
                    <details
                      key={it.id || `${cat.id}-${idx}`}
                      className="group px-4 py-4 md:px-5"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-900 group-open:text-blue-700">
                              {it.question}
                            </div>
                            {it.hint ? (
                              <div className="mt-1 text-xs text-slate-500">{it.hint}</div>
                            ) : null}
                          </div>
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-200 transition group-open:bg-blue-50 group-open:text-blue-700 group-open:ring-blue-200">
                            <span className="text-lg leading-none">+</span>
                          </div>
                        </div>
                      </summary>

                      <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        {renderAnswer(it.answer)}

                        {Array.isArray(it.tags) && it.tags.length ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {it.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer helper */}
        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Still stuck?
              </div>
              <p className="mt-1 text-sm text-slate-600">
                If you can't find what you need here, start by checking your Notifications for admin announcements,
                then contact your Admin/support team.
              </p>
            </div>
            <Link
              href={backHref}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
