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
    <main className="main">
      <Link href={`/${locale}/loyalty`}>{ar ? "الولاء" : "Loyalty"}</Link>
      <h1>{ar ? "التحديات الصحية" : "Health challenges"}</h1>
      <LoyaltyChallengesClient initial={challenges} locale={locale} />
    </main>
  );
}
