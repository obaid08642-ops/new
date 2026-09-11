"use client";

import { useState } from "react";

/**
 * "Cite this information" block — organic citation engine.
 * Generates BibTeX + plain-text citations from REAL page data
 * (title, canonical URI, author, publish date). No fabricated facts.
 */
export function CiteThis({ title, uri, author, authorTitle, publishedAt, locale }: {
  title: string;
  uri: string;
  author?: string | null;
  authorTitle?: string | null;
  publishedAt?: string | null;
  locale: string;
}) {
  const [copied, setCopied] = useState("");
  const isAr = locale === "ar";
  const year = publishedAt ? new Date(publishedAt).getFullYear() : new Date().getFullYear();
  const key = `nabd-${year}-${title.slice(0, 12).replace(/\s+/g, "")}`;
  const bibtex = `@misc{${key},\n  title = {${title}},\n  author = {${author || "Nabd Plus"}},\n  year = {${year}},\n  url = {${uri}},\n  note = {${isAr ? "منصة نبض بلس الصحية" : "Nabd Plus healthcare platform"}}\n}`;
  const plain = `${author ? `${author}. ` : ""}"${title}." Nabd Plus${publishedAt ? `, ${new Date(publishedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}` : ""}. ${uri}`;
  const copy = async (text: string, which: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 2000);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <section aria-label={isAr ? "استشهد بهذه المعلومة" : "Cite this information"} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem", marginTop: "2rem", background: "#f8fafc" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>{isAr ? "استشهد بهذه المعلومة" : "Cite this information"}</h2>
      <p style={{ fontSize: "0.85rem", color: "#475569", overflowWrap: "anywhere" }}>{plain}</p>
      <pre style={{ fontSize: "0.75rem", background: "#fff", padding: "0.75rem", borderRadius: "8px", overflowX: "auto", direction: "ltr", textAlign: "left" }}>{bibtex}</pre>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button onClick={() => copy(plain, "plain")} style={{ padding: "0.4rem 0.9rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>
          {copied === "plain" ? (isAr ? "تم النسخ ✓" : "Copied ✓") : (isAr ? "نسخ الاقتباس" : "Copy citation")}
        </button>
        <button onClick={() => copy(bibtex, "bib")} style={{ padding: "0.4rem 0.9rem", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>
          {copied === "bib" ? (isAr ? "تم النسخ ✓" : "Copied ✓") : "BibTeX"}
        </button>
      </div>
    </section>
  );
}
