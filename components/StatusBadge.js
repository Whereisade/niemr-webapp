

const MAP = {
  scheduled: { text: "Scheduled", cls: "bg-sky-100 text-sky-800 ring-sky-200" },
  booked:    { text: "Booked",    cls: "bg-indigo-100 text-indigo-800 ring-indigo-200" },
  pending:   { text: "Pending",   cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  checked_in:{ text: "Checked In",cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  in_progress:{text: "In Progress",cls:"bg-blue-100 text-blue-800 ring-blue-200"},
  completed: { text: "Completed", cls: "bg-emerald-200 text-emerald-900 ring-emerald-300" },
  cancelled: { text: "Cancelled", cls: "bg-rose-100 text-rose-800 ring-rose-200" },
  no_show:   { text: "No-Show",   cls: "bg-gray-200 text-gray-800 ring-gray-300" },
};

export default function StatusBadge({ value }) {
  const key = String(value || "").toLowerCase();
  const m = MAP[key] || { text: value || "—", cls: "bg-slate-100 text-slate-700 ring-slate-200" };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${m.cls}`}>
      {m.text}
    </span>
  );
}
