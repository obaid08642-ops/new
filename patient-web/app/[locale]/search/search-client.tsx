"use client";

import { useEffect, useRef, useState } from "react";
import { extractSearchResults, type SearchResult } from "@/lib/api/search";

type Labels = { placeholder: string; empty: string; error: string; searching: string };

export function SearchClient({ locale, labels }: { locale: string; labels: Labels }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setState("idle"); return; }
    timer.current = setTimeout(async () => {
      setState("loading");
      try {
        const response = await fetch(`/api/patient/home/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("search_unavailable");
        setResults(extractSearchResults(await response.json().catch(() => []), locale));
        setState("idle");
      } catch {
        setState("error");
      }
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, locale]);

  return <div>
    <input
      type="search"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      placeholder={labels.placeholder}
      aria-label={labels.placeholder}
      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border, #d6dbe3)", fontSize: 16 }}
    />
    {state === "loading" && <p role="status">{labels.searching}</p>}
    {state === "error" && <p role="alert">{labels.error}</p>}
    {state !== "loading" && query.trim().length >= 2 && results.length === 0 && state !== "error" && <p>{labels.empty}</p>}
    <ul style={{ listStyle: "none", padding: 0, marginTop: 16, display: "grid", gap: 8 }}>
      {results.map((result) => (
        <li key={`${result.type}-${result.id}`} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border, #e2e7ee)", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <strong>{result.name}</strong>
            {result.sub ? <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>{result.sub}</p> : null}
          </div>
          <span style={{ fontSize: 13, opacity: 0.7, whiteSpace: "nowrap" }}>{result.type}</span>
        </li>
      ))}
    </ul>
  </div>;
}
