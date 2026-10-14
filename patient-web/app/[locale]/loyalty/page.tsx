import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { formatDate } from "@/lib/format-date";
import { isLocale } from "@/lib/i18n";
import { parseAccount, parseChallenges, parseConfig, parseReferrals, parseRewards, parseTransactions, pickLoyaltyTab, tierProgress, type Tier } from "@/lib/loyalty/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { CareHero, RecordRow } from "@/components-next/care/care-kit";
import { HealthTabs, PartUnavailable, RowsCard, SectionHead, VitalTile } from "@/components-next/health/health-kit";
import { InvitePanel, JoinChallenge, RedeemReward } from "@/components-next/loyalty/loyalty-actions";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import health from "@/components-next/health/health.module.css";
import styles from "@/components-next/loyalty/loyalty.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[] }> };

const POINTS = SERVICE_ICONS.points;
const TIER_TONES = [SERVICE_ICONS.points.tone, SERVICE_ICONS.consult.tone, SERVICE_ICONS.radiology.tone, SERVICE_ICONS.nursing.tone, SERVICE_ICONS.maternity.tone];
const REASONS = ["booking_completed", "order_delivered", "review_submitted", "vitals_logged", "reward_claimed", "points_expired", "referral_converted"];

/**
 * The loyalty hub (merge map 2, section 7): the points balance with its tier, three link tabs `?tab=rewards|challenges|invite`
 * (the old rewards, challenges and referrals pages) and the points history, on one screen. GET /loyalty/account, /loyalty/config
 * (tiers and ways to earn: the server's own), /loyalty/transactions; the tab reads /loyalty/rewards, /loyalty/challenges or
 * /referrals/my. The leaderboard is a removed feature (decision 2). The screen adds no rule, no rate and no amount.
 */
export default async function LoyaltyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("LoyaltyHubWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const base = `/${locale}/loyalty`;
  const tab = pickLoyaltyTab(query.tab);
  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/dashboard`}>
      {body}
    </ConsultPage>
  );
  const failed = () => frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  let account: Response, config: Response, history: Response;
  try {
    [account, config, history] = await Promise.all([
      callPatientApi("/loyalty/account", {}, token),
      callPatientApi("/loyalty/config", {}, token),
      callPatientApi("/loyalty/transactions?page=1", {}, token),
    ]);
  } catch {
    return failed();
  }
  if (account.status === 401) redirect(`/${locale}/login`);
  if (!account.ok || !config.ok) return failed();
  const { points, tier } = parseAccount(await account.json().catch(() => null));
  const { tiers, earnWays } = parseConfig(await config.json().catch(() => null));
  if (tiers.length === 0) return failed();
  const transactions = history.ok ? parseTransactions(await history.json().catch(() => null)) : null;
  const progress = tierProgress(tiers, tier, points);
  const current = progress.current as Tier;
  const number = new Intl.NumberFormat(locale);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const toneOf = (index: number) => TIER_TONES[index % TIER_TONES.length];
  const date = (value?: string) => formatDate(locale, value ?? null) ?? undefined;
  const pts = (n: number | string) => t("pointsAmount", { points: typeof n === "number" ? number.format(n) : n });

  let content: ReactNode = null;
  if (tab === "rewards") {
    const res = await callPatientApi("/loyalty/rewards", {}, token).catch(() => null);
    const rewards = res?.ok ? parseRewards(await res.json().catch(() => null)) : null;
    content = (
      <>
        <SectionHead id="rewards" title={t("rewardsTitle")} />
        {rewards === null ? (
          <PartUnavailable>{t("partUnavailable")}</PartUnavailable>
        ) : rewards.length === 0 ? (
          <ConsultState kind="empty" icon={POINTS.icon} tone={POINTS.tone} title={t("rewardsEmptyTitle")} body={t("rewardsEmptyBody")} />
        ) : (
          <RowsCard label={t("rewardsTitle")}>
            {rewards.map((r) => (
              <li key={r.id}>
                <RecordRow icon="gift" tone={POINTS.tone} title={r.title} sub={[r.description, pts(r.pointsRequired)]} end={<RedeemReward rewardId={r.id} title={r.title} cost={number.format(r.pointsRequired)} disabled={points < r.pointsRequired} />} />
              </li>
            ))}
          </RowsCard>
        )}
        {earnWays.length > 0 ? (
          <>
            <SectionHead id="earn" title={t("earnTitle")} />
            <RowsCard label={t("earnTitle")}>
              {earnWays.map((w, i) => (
                <li key={`${w.action}-${i}`}><RecordRow icon="star" tone={toneOf(i)} title={w.action} sub={[pts(w.points)]} /></li>
              ))}
            </RowsCard>
          </>
        ) : null}
        {current.perks.length > 0 ? (
          <>
            <SectionHead id="perks" title={t("perksTitle", { tier: current.label })} />
            <RowsCard label={t("perksTitle", { tier: current.label })}>
              {current.perks.map((p, i) => <li key={`${p}-${i}`}><RecordRow icon="check-circle" tone={SERVICE_ICONS.lab.tone} title={p} /></li>)}
            </RowsCard>
          </>
        ) : null}
        {progress.next && progress.next.perks.length > 0 ? (
          <>
            <SectionHead id="next-perks" title={t("nextPerksTitle", { tier: progress.next.label })} />
            <RowsCard label={t("nextPerksTitle", { tier: progress.next.label })}>
              {progress.next.perks.slice(0, 2).map((p, i) => <li key={`${p}-${i}`}><RecordRow icon="star" tone={POINTS.tone} title={p} /></li>)}
            </RowsCard>
          </>
        ) : null}
      </>
    );
  } else if (tab === "challenges") {
    const res = await callPatientApi("/loyalty/challenges", {}, token).catch(() => null);
    const challenges = res?.ok ? parseChallenges(await res.json().catch(() => null)) : null;
    content =
      challenges === null ? (
        <PartUnavailable>{t("partUnavailable")}</PartUnavailable>
      ) : challenges.length === 0 ? (
        <ConsultState kind="empty" icon="chart-line-up" tone={SERVICE_ICONS.maternity.tone} title={t("challengesEmptyTitle")} body={t("challengesEmptyBody")} />
      ) : (
        <>
          <ul className={health.tiles}>
            <li><VitalTile label={t("challengesJoined")} value={number.format(challenges.filter((c) => c.joined).length)} icon="chart-line-up" tone={SERVICE_ICONS.consult.tone} /></li>
            <li><VitalTile label={t("challengesCompleted")} value={number.format(challenges.filter((c) => c.completed).length)} icon="check-circle" tone={SERVICE_ICONS.lab.tone} /></li>
            <li><VitalTile label={t("challengesEarned")} value={number.format(challenges.reduce((sum, c) => sum + (c.completed ? c.rewardPoints ?? 0 : 0), 0))} unit={t("points")} icon="star" tone={POINTS.tone} /></li>
          </ul>
          <RowsCard label={t("tabChallenges")}>
            {challenges.map((c) => (
              <li key={c.id}>
                <RecordRow
                  icon="chart-line-up"
                  tone={SERVICE_ICONS.maternity.tone}
                  title={c.title}
                  sub={[
                    c.desc,
                    c.rewardPoints !== undefined ? t("challengeReward", { points: number.format(c.rewardPoints) }) : undefined,
                    date(c.endDate) ? t("challengeEnds", { date: date(c.endDate) as string }) : undefined,
                    c.joined && c.total ? <progress key="p" className={styles.progress} value={Math.min(c.progress, c.total)} max={c.total} aria-label={t("challengeProgress", { done: number.format(c.progress), total: number.format(c.total) })} /> : undefined,
                  ].filter((line) => line !== undefined)}
                  end={c.completed ? t("challengeDone") : c.joined ? c.total ? percent.format(Math.min(1, c.progress / c.total)) : t("challengeInProgress") : <JoinChallenge challengeId={c.id} />}
                />
              </li>
            ))}
          </RowsCard>
        </>
      );
  } else {
    const res = await callPatientApi("/referrals/my", {}, token).catch(() => null);
    const referrals = res?.ok ? parseReferrals(await res.json().catch(() => null)) : null;
    content =
      referrals === null ? (
        <PartUnavailable>{t("partUnavailable")}</PartUnavailable>
      ) : (
        <>
          <section className={`${rx.card}`} aria-label={t("inviteTitle")}>
            <h2 className={health.sectionTitle}>{t("inviteTitle")}</h2>
            <p className={styles.fieldHint}>{t("inviteBody")}</p>
            <InvitePanel code={referrals.code} />
          </section>
          <ul className={health.tiles}>
            <li><VitalTile label={t("inviteEarned")} value={number.format(referrals.earned)} unit={t("points")} icon="star" tone={POINTS.tone} /></li>
            <li><VitalTile label={t("inviteTotal")} value={number.format(referrals.total)} icon="users" tone={SERVICE_ICONS.consult.tone} /></li>
          </ul>
          <SectionHead id="invites" title={t("inviteHistory")} />
          {referrals.invites.length === 0 ? (
            <ConsultState kind="empty" icon="users" tone={SERVICE_ICONS.consult.tone} title={t("inviteEmptyTitle")} body={t("inviteEmptyBody")} />
          ) : (
            <RowsCard label={t("inviteHistory")}>
              {referrals.invites.map((i) => (
                <li key={i.id}>
                  <RecordRow icon="users" tone={i.rewarded ? SERVICE_ICONS.lab.tone : SERVICE_ICONS.consult.tone} title={i.name ?? t("inviteeFallback")} sub={[i.rewarded ? t("inviteRewarded") : t("inviteRegistered"), date(i.createdAt)].filter((line) => line !== undefined)} />
                </li>
              ))}
            </RowsCard>
          )}
        </>
      );
  }

  return frame(
    <>
      <CareHero
        tone={toneOf(progress.index)}
        icon={POINTS.icon}
        label={t("balanceLabel")}
        ring={{ value: progress.share, label: t("balanceRing", { points: number.format(points) }), valueText: number.format(points), caption: t("points") }}
        title={current.label}
        lines={progress.next && progress.missing > 0 ? [t("toNext", { points: number.format(progress.missing), tier: progress.next.label })] : []}
      />
      <HealthTabs
        label={t("tabsLabel")}
        base={base}
        active={tab}
        options={[
          { value: "rewards", label: t("tabRewards") },
          { value: "challenges", label: t("tabChallenges") },
          { value: "invite", label: t("tabInvite") },
        ]}
      />
      {content}
      <SectionHead id="history" title={t("historyTitle")} />
      {transactions === null ? (
        <PartUnavailable>{t("partUnavailable")}</PartUnavailable>
      ) : transactions.length === 0 ? (
        <ConsultState kind="empty" icon={POINTS.icon} tone={POINTS.tone} title={t("historyEmptyTitle")} body={t("historyEmptyBody")} />
      ) : (
        <RowsCard label={t("historyTitle")}>
          {transactions.map((tx) => (
            <li key={tx.id}>
              <RecordRow
                icon="star"
                tone={tx.delta > 0 ? SERVICE_ICONS.lab.tone : SERVICE_ICONS.pharmacy.tone}
                title={tx.description ?? (tx.reason && REASONS.includes(tx.reason) ? t(`reason.${tx.reason}`) : tx.reason ?? "—")}
                sub={[date(tx.createdAt)].filter((line) => line !== undefined)}
                end={<bdi className={`${styles.delta} ${tx.delta > 0 ? styles.deltaUp : styles.deltaDown}`}>{tx.delta > 0 ? "+" : "−"}{number.format(Math.abs(tx.delta))}</bdi>}
              />
            </li>
          ))}
        </RowsCard>
      )}
    </>,
  );
}
