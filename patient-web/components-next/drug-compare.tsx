"use client";

import { useState } from "react";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

type Row = Record<string, unknown>;

/**
 * Drug compare (parity #33): pick 2-6 catalog medicine ids and render the
 * server comparison verbatim — no client-side price/stock computation.
 */
export function DrugCompare({ suggestions }: { suggestions: { id: string; label: string }[] }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    const ids = [...new Set(["a", "b", "c", "d", "e", "f"].map((k) => String(form.get(k) || "").trim()).filter(Boolean))];
    if (ids.length < 2) { setError("اختر دواءين على الأقل"); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/medicines/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) {
        setError("تعذر جلب المقارنة");
        return;
      }
      setRows(data);
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  const columns = rows ? Object.keys(rows[0] || {}).slice(0, 8) : [];

  return (
    <div style={{ marginTop: ".9rem", display: "grid", gap: ".6rem" }}>
      <form onSubmit={submit} className="grid gap-2 md:grid-cols-3">
        {["أ", "ب", "ج"].map((label, index) => (
          <select key={index} name={["a", "b", "c"][index]} aria-label={`الدواء ${label}`} defaultValue="" style={fieldStyle}>
            <option value="">— الدواء {label} —</option>
            {suggestions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        ))}
        <button type="submit" disabled={busy}
          style={{ border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
          {busy ? "..." : "قارن"}
        </button>
      </form>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      {rows && rows.length > 0 && columns.length > 0 ? (
        <div className="overflow-auto rounded-xl border border-black/10 bg-white p-2 shadow-sm">
          <table className="w-full text-sm">
            <thead><tr>{columns.map((col) => <th key={col} className="p-2 text-right border-b">{col}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={String(row.id ?? index)}>
                  {columns.map((col) => (
                    <td key={col} className="p-2 border-b text-xs" style={{ maxWidth: 220, overflowWrap: "anywhere" }}>
                      {typeof row[col] === "object" ? JSON.stringify(row[col]).slice(0, 120) : String(row[col] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
