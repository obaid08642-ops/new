"use client";

import { useEffect } from "react";
import { reportSegmentError } from "@/lib/error-report";

/**
 * P15.5 — the last-resort boundary. When the root layout itself crashes, the
 * locale provider is gone too, so this page cannot use next-intl and carries
 * its copy in both languages inline. It still reports, still offers "try
 * again" and "contact support", and never paints a white screen.
 */

const copy = {
  titleEn: "Something went wrong",
  titleAr: "حدث خطأ ما",
  bodyEn: "The page could not be opened. Try again, or contact support.",
  bodyAr: "تعذّر فتح الصفحة. حاول مرة أخرى أو تواصل مع الدعم.",
  retryEn: "Try again",
  retryAr: "حاول مرة أخرى",
  supportEn: "Contact support",
  supportAr: "تواصل مع الدعم",
} as const;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportSegmentError(error, { segment: "global" });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#FDFDFC", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ padding: "32px 16px" }}>
          <section
            role="alert"
            aria-live="assertive"
            style={{ background: "#fff", border: "1px solid #E8EDEE", borderRadius: 20, padding: 32, maxWidth: 480, margin: "0 auto", display: "grid", gap: 16 }}
          >
            <h1 style={{ margin: 0, color: "#1E332E" }}>{copy.titleEn}</h1>
            <p style={{ margin: 0, color: "#6B7C6E" }}>{copy.bodyEn}</p>
            <h1 lang="ar" dir="rtl" style={{ margin: 0, color: "#1E332E" }}>
              {copy.titleAr}
            </h1>
            <p lang="ar" dir="rtl" style={{ margin: 0, color: "#6B7C6E" }}>
              {copy.bodyAr}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "none", padding: "10px 20px", cursor: "pointer" }}
              >
                {copy.retryEn} / {copy.retryAr}
              </button>
              <a
                href="/en/support"
                style={{ background: "#1E332E", color: "#fff", borderRadius: 20, padding: "10px 20px", textDecoration: "none" }}
              >
                {copy.supportEn}
              </a>
              <a
                href="/ar/support"
                lang="ar"
                dir="rtl"
                style={{ background: "transparent", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "10px 20px", textDecoration: "none" }}
              >
                {copy.supportAr}
              </a>
            </div>
            {error.digest ? <p style={{ margin: 0, color: "#6B7C6E", fontSize: ".75rem" }}>ref: {error.digest}</p> : null}
          </section>
        </main>
      </body>
    </html>
  );
}
