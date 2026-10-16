"use client";

import { useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { pageType } from "@/lib/perf/page-type";

/**
 * P14.23 real-user monitoring. A share of page views (SAMPLE_RATE) keeps its web-vitals (LCP, INP, CLS, FCP, TTFB) and
 * sends them once, when the page is hidden, with navigator.sendBeacon as text/plain JSON (no CORS preflight, survives
 * the page closing) to POST /api/v1/rum/vitals. What is sent: the page type, the locale, the device class, each
 * metric's value and rating. No URL, id, cookie or user. The admin "Web vitals" page shows the p75 per page type.
 */
const SAMPLE_RATE = 0.25;
const API = (process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus").replace(/\/$/, "");
const KEPT = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);

type Sample = { name: string; value: number; rating: string; nav?: string };

export function WebVitalsReporter({ locale }: { locale: string }) {
  const sampled = useRef<boolean | null>(null);
  const samples = useRef(new Map<string, Sample>());
  const sent = useRef(false);

  useReportWebVitals((metric) => {
    if (sampled.current === null) sampled.current = Math.random() < SAMPLE_RATE;
    if (!sampled.current || !KEPT.has(metric.name)) return;
    samples.current.set(metric.name, {
      name: metric.name,
      value: Math.max(0, metric.name === "CLS" ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value)),
      rating: metric.rating,
      nav: metric.navigationType,
    });
  });

  useEffect(() => {
    const type = pageType(window.location.pathname);
    const device = window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
    const flush = () => {
      if (sent.current || samples.current.size === 0 || typeof navigator.sendBeacon !== "function") return;
      sent.current = true;
      const body = JSON.stringify({ page_type: type, locale, device, samples: [...samples.current.values()].slice(0, 5) });
      navigator.sendBeacon(`${API}/api/v1/rum/vitals`, new Blob([body], { type: "text/plain" }));
    };
    const onHidden = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
    };
  }, [locale]);

  return null;
}
