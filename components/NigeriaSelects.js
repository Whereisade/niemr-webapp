"use client";
import { COUNTRIES, NIGERIA_STATES_BY_CODE } from "@/lib/geo";

export function CountrySelect({ value, onChange, name="country", required=true }) {
  return (
    <select name={name} value={value} onChange={onChange} required={required}
      className="w-full rounded-xl border p-2">
      {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
    </select>
  );
}

export function StateSelect({ value, onChange, name="state", required=false }) {
  const entries = Object.entries(NIGERIA_STATES_BY_CODE);
  return (
    <select name={name} value={value} onChange={onChange} required={required}
      className="w-full rounded-xl border p-2">
      <option value="">Select state</option>
      {entries.map(([k,v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}
