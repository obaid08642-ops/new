import { VectorLoyalty } from "@/components-next/vector-illustrations";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { LoyaltyChallengesClient, type Challenge } from "@/components-next/loyalty-challenges-client";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parity with app loyalty/challenges: live list + join + progress, server data only. */
export default async function LoyaltyChallengesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/loyalty/challenges", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = asRecord(await response.json().catch(() => null));
  const list = [payload?.data, payload?.challenges].find(Array.isArray);
  const challenges: Challenge[] = (Array.isArray(list) ? list : []).flatMap((c) => {
    const o = asRecord(c);
    if (!o || typeof o.id !== "string") return [];
    const target = Number(o.target_count ?? 7) || 7;
    const progress = Number(o.user_progress ?? 0) || 0;
    const completed = o.completed === true;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
    return [{
      id: o.id,
      title: str(o.title) ?? str(o.title_ar) ?? o.id,
      desc: str(o.desc) ?? str(o.description),
      icon: str(o.icon),
      rewardPoints: Number(o.reward_points ?? 0) || 0,
      endDate: str(o.end_date),
      joined: o.joined === true || progress > 0 || completed,
      completed,
      progress,
      total: target,
    }];
  });
  return (
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <section style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" } as React.CSSProperties}><div style={{ minWidth: 0 }}><Link href={`/${locale}/loyalty`} style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" } as React.CSSProperties}>{ar ? "الولاء" : "Loyalty"}</Link><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "التحديات الصحية" : "Health challenges"}</h1></div><span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorLoyalty size={48} aria-hidden="true" /></span><span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center" } as React.CSSProperties} aria-hidden="true" />
      </section>
      <LoyaltyChallengesClient initial={challenges} locale={locale} />
    </main>
  );
}
