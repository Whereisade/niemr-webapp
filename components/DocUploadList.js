
"use client";
import { useState } from "react";

export default function DocUploadList({ initial = [] }) {
  const [rows, setRows] = useState(initial);

  const addRow = () => setRows([...rows, { kind: "", file: null }]);
  const change = (i, key, val) => setRows(r => r.map((x,idx)=> idx===i ? {...x,[key]:val} : x));
  const remove = (i) => setRows(r => r.filter((_,idx)=> idx!==i));

  return (
    <div className="space-y-3">
      {rows.map((r,i)=>(
        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <input name={`documents[${i}][kind]`} value={r.kind} onChange={e=>change(i,"kind",e.target.value)}
            placeholder="e.g., license, degree" className="rounded-xl border p-2" />
          <input type="file" name={`documents[${i}][file]`} onChange={e=>change(i,"file",e.target.files?.[0]||null)}
            className="rounded-xl border p-2" />
          <button type="button" onClick={()=>remove(i)} className="text-sm underline">Remove</button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="rounded-xl border px-3 py-2">+ Add document</button>
    </div>
  );
}
