import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ClaimButton } from "./claim-button";
import { VectorLoyalty } from "@/components-next/vector-illustrations";
import { Award, Coins, Gift, History, Sparkles } from "lucide-react";
import styles from "./loyalty.module.css";

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

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <Sparkles size={15} aria-hidden="true" />
            {isAr ? "برنامج مكافآت نبض بلس" : "Nabd Plus Rewards"}
          </p>
          <h1>{t("title")}</h1>
          <p>
            {isAr
              ? "اجمع النقاط مع كل استشارة، فحص، أو طلب دواء واستبدلها بخصومات وجلسات مجانية."
              : "Earn points with every consultation, test, or prescription and redeem for exclusive perks."}
          </p>
        </div>
        <div className={styles.heroIllustration}>
          <VectorLoyalty size={80} />
        </div>
      </section>

      <section className={styles.pointsCard}>
        <div className={styles.pointsMeta}>
          <span className={styles.pointsLabel}>{t("points")}</span>
          <strong className={styles.pointsValue}>{points.toLocaleString(locale)}</strong>
        </div>
        {tier ? (
          <div className={styles.tierBadge}>
            <Award size={16} aria-hidden="true" />
            <span>{t("tier")}: {tier}</span>
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>
            <Gift size={20} aria-hidden="true" />
            {t("rewards")}
          </h2>
        </div>
        {rewards.length === 0 ? (
          <div className={styles.emptyState}>
            <Gift size={32} aria-hidden="true" />
            <p>{t("noRewards")}</p>
          </div>
        ) : (
          <div className={styles.rewardsGrid}>
            {rewards.map((reward) => (
              <div key={reward.id} className={styles.rewardCard}>
                <div className={styles.rewardInfo}>
                  <strong>{reward.title}</strong>
                  {reward.cost ? (
                    <p className={styles.rewardCost}>
                      <Coins size={14} aria-hidden="true" />
                      {reward.cost.toLocaleString(locale)} {t("points")}
                    </p>
                  ) : null}
                </div>
                <ClaimButton rewardId={reward.id} disabled={reward.cost !== undefined && points < reward.cost} labels={labels} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>
            <History size={20} aria-hidden="true" />
            {t("history")}
          </h2>
        </div>
        {txns.length === 0 ? (
          <div className={styles.emptyState}>
            <History size={32} aria-hidden="true" />
            <p>{t("noHistory")}</p>
          </div>
        ) : (
          <div className={styles.txnsList}>
            {txns.map((txn) => (
              <div key={txn.id} className={styles.txnItem}>
                <span className={styles.txnReason}>{txn.reason ?? "—"}</span>
                <strong className={txn.points > 0 ? styles.txnPositive : styles.txnNegative}>
                  {txn.points > 0 ? "+" : ""}{txn.points.toLocaleString(locale)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
