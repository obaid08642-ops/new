import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";

/**
 * The public feature pages (owner 2026-10-12, SEO/GEO/AEO): one indexable page per Nabd Plus feature at
 * `/{locale}/features/{slug}`. The text lives in `FeaturePages.<key>` of the six message files and describes only what the
 * signed-in screen does today; `cta` is that screen (it must exist under app/[locale]) and `points`/`faq` are how many
 * numbered keys the feature has (`p1Title`/`p1Body`…, `q1`/`a1`…). The FAQ JSON-LD is built from the same keys as the
 * visible questions, so the two can never differ.
 */
export type FeaturePage = {
  slug: string;
  key: string;
  icon: FillIconName;
  tone: ServiceTone;
  /** The signed-in screen the page leads to (path after the locale, query allowed). */
  cta: string;
  /** A second way in (the urgent-help screen of mental health). */
  secondary?: { href: string; labelKey: string };
  points: number;
  faq: number;
  /** schema.org Service for a bookable service (online consultations only). */
  service?: boolean;
};

export const FEATURE_PAGES: readonly FeaturePage[] = [
  { slug: "medication-reminders", key: "medicationReminders", icon: SERVICE_ICONS.pharmacy.icon, tone: SERVICE_ICONS.pharmacy.tone, cta: "/health/medications", points: 3, faq: 3 },
  { slug: "pregnancy", key: "pregnancy", icon: SERVICE_ICONS.maternity.icon, tone: SERVICE_ICONS.maternity.tone, cta: "/maternity", points: 3, faq: 3 },
  { slug: "mental-health", key: "mentalHealth", icon: SERVICE_ICONS.mind.icon, tone: SERVICE_ICONS.mind.tone, cta: "/mental-health", secondary: { href: "/emergency", labelKey: "urgentCta" }, points: 3, faq: 3 },
  { slug: "nutrition", key: "nutrition", icon: SERVICE_ICONS.nutrition.icon, tone: SERVICE_ICONS.nutrition.tone, cta: "/nutrition", points: 3, faq: 3 },
  { slug: "family", key: "family", icon: SERVICE_ICONS.family.icon, tone: SERVICE_ICONS.family.tone, cta: "/family", points: 3, faq: 3 },
  { slug: "loyalty", key: "loyalty", icon: SERVICE_ICONS.points.icon, tone: SERVICE_ICONS.points.tone, cta: "/loyalty", points: 3, faq: 3 },
  { slug: "online-consultations", key: "onlineConsultations", icon: "video-camera", tone: SERVICE_ICONS.consult.tone, cta: "/consultations/doctors?type=video", points: 3, faq: 3, service: true },
];

export const FEATURE_SLUGS = FEATURE_PAGES.map((feature) => feature.slug);

export function findFeature(slug: string): FeaturePage | undefined {
  return FEATURE_PAGES.find((feature) => feature.slug === slug);
}

/** The numbered keys 1..n (`p1`, `p2`…). */
export function numbered(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}
