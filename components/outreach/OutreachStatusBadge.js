import { Flame, Lock, DraftingCompass } from "lucide-react";

const MAP = {
  draft: { text: "Draft", cls: "bg-slate-100 text-slate-700 ring-slate-200", icon: DraftingCompass },
  active: { text: "Active", cls: "bg-emerald-100 text-emerald-800 ring-emerald-200", icon: Flame },
  closed: { text: "Closed", cls: "bg-rose-100 text-rose-800 ring-rose-200", icon: Lock },
};

export default function OutreachStatusBadge({ value }) {
  const key = String(value || "").toLowerCase();
  const m = MAP[key] || { text: value || "—", cls: "bg-slate-100 text-slate-700 ring-slate-200", icon: DraftingCompass };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${m.cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {m.text}
    </span>
  );
}
