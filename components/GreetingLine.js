// app/components/GreetingLine.js
"use client";

import { useEffect, useState } from "react";
import { Building2, UserRound } from "lucide-react";

function getPartOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default function GreetingLine({ name = "", className = "" }) {
  const [partOfDay, setPartOfDay] = useState(getPartOfDay);

  useEffect(() => {
    const id = setInterval(() => setPartOfDay(getPartOfDay), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Allow "Person · Facility" so we can style them differently
  const [personName, facilityName] = name.split("·").map((s) => s.trim());

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Avatar / icon */}
      <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/10">
        <UserRound className="h-5 w-5 text-blue-700" />
      </div>

      <div className="space-y-1">
        {/* Small greeting line */}
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {partOfDay ? `Good ${partOfDay}` : "Welcome"}
        </p>

        {/* Name + facility pill */}
        <div className="flex flex-wrap items-baseline gap-2">
          {personName && (
            <span className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              {personName}
            </span>
          )}

          {facilityName && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
              <span>{facilityName}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
