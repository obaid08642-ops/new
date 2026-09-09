"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LabService } from "@/app/[locale]/diagnostics/search/page";

export function DiagnosticsSearchClient({ services, initialQuery, locale }: {
  services: LabService[]; initialQuery: string; locale: string;
}) {
  const ar = locale === "ar";
  const [q, setQ] = useState(initialQuery);
  const results = useMemo(() => (q ? services.filter((t) => t.name.includes(q)) : services), [services, q]);
  return (
    <div>
      <label>
        <span>{ar ? "ابحث عن تحليل..." : "Search tests..."}</span>
        <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث عن تحليل..." : "Search tests..."} />
      </label>
      {results.length === 0 ? (
        <p role="status">{ar ? "لا توجد نتائج" : "No results"}</p>
      ) : (
        <ul>
          {results.map((t) => (
            <li key={t.id}>
              <Link href={`/${locale}/diagnostics/test-detail?testId=${encodeURIComponent(t.id)}`}>
                <strong>{t.name}</strong>
                {t.category ? <span> — {t.category}</span> : null}
                <span> — {t.price} {ar ? "ر.س" : "SAR"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
