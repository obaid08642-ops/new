import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ClaimButton } from "./claim-button";

type Props = { params: Promise<{ locale: string }> };

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

type Reward = { id: string; title: string; cost?: number };
type Txn = { id: string; points: number; reason?: string; createdAt?: string };

export default async function LoyaltyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Loyalty");
  const isAr = locale === "ar";
  const [accountRes, rewardsRes, txnsRes] = await Promise.all([
    callPatientApi("/loyalty/account", {}, token),
    callPatientApi("/loyalty/rewards", {}, token),
    callPatientApi("/loyalty/transactions?page=1", {}, token),
  ]);
  const account = accountRes.ok ? rec(await accountRes.json().catch(() => null)) : null;
  const points = Number(account?.points ?? account?.balance ?? account?.points_balance ?? 0);
  const tier = typeof account?.tier === "string" ? account.tier : null;
  const rewardsPayload = rewardsRes.ok ? await rewardsRes.json().catch(() => null) : null;
  const rewardsRoot = rec(rewardsPayload);
  const rewardsList = (Array.isArray(rewardsPayload) ? rewardsPayload : [rewardsRoot?.data, rewardsRoot?.rewards, rewardsRoot?.items].find(Array.isArray)) ?? [];
  const rewards: Reward[] = rewardsList.flatMap((value) => {
    const r = rec(value);
    if (!r || !r.id) return [];
    const title = String((isAr ? r.title_ar : r.title_en) ?? r.title_ar ?? r.title_en ?? r.title ?? r.name ?? "");
    return title ? [{ id: String(r.id), title, cost: Number(r.cost_points ?? r.points ?? r.cost ?? 0) || undefined }] : [];
  });
  const txnsPayload = txnsRes.ok ? await txnsRes.json().catch(() => null) : null;
  const txnsRoot = rec(txnsPayload);
  const txnsList = (Array.isArray(txnsPayload) ? txnsPayload : [txnsRoot?.data, txnsRoot?.transactions, txnsRoot?.items].find(Array.isArray)) ?? [];
  const txns: Txn[] = txnsList.flatMap((value) => {
    const r = rec(value);
    if (!r) return [];
    const pts = Number(r.points ?? r.amount ?? 0);
    if (!Number.isFinite(pts) || pts === 0) return [];
    return [{ id: String(r.id ?? `${pts}-${r.createdAt ?? ""}`), points: pts, reason: typeof r.reason === "string" ? r.reason : typeof r.type === "string" ? r.type : undefined, createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined }];
  });
  const labels = { claim: t("claim"), claiming: t("claiming"), claimed: t("claimed"), error: t("error") };
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    <section style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
      <strong style={{ fontSize: 28 }}>{points.toLocaleString(locale)}</strong>
      <span style={{ marginInlineStart: 8, opacity: 0.7 }}>{t("points")}</span>
      {tier ? <p style={{ margin: "4px 0 0", opacity: 0.7 }}>{t("tier")}: {tier}</p> : null}
    </section>
    <h2>{t("rewards")}</h2>
    {rewards.length === 0 ? <p style={{ opacity: 0.7 }}>{t("noRewards")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {rewards.map((reward) => (
          <li key={reward.id} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <strong>{reward.title}</strong>
              {reward.cost ? <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{reward.cost.toLocaleString(locale)} {t("points")}</p> : null}
            </div>
            <ClaimButton rewardId={reward.id} disabled={reward.cost !== undefined && points < reward.cost} labels={labels} />
          </li>
        ))}
      </ul>
    )}
    <h2 style={{ marginTop: 24 }}>{t("history")}</h2>
    {txns.length === 0 ? <p style={{ opacity: 0.7 }}>{t("noHistory")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 6 }}>
        {txns.map((txn) => (
          <li key={txn.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border, #eef1f5)", padding: "8px 0", fontSize: 14 }}>
            <span>{txn.reason ?? "—"}</span>
            <strong style={{ color: txn.points > 0 ? "var(--primary, #0d6e56)" : "#b3261e" }}>{txn.points > 0 ? "+" : ""}{txn.points.toLocaleString(locale)}</strong>
          </li>
        ))}
      </ul>
    )}
  </main>;
}
