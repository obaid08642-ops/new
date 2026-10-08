import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';

import { Button, EmptyState, Input, SERVICE_TONES, type ServiceTone } from '../../../../packages/ui-native/src';
import { Gate, Sheet, Section, useConsultFormat } from '../consult/ConsultKit';
import { CareBar, CareHero, CareScreen } from '../care/CareKit';
import { HealthTabs, MetricGrid, MetricTile, Notice, Panel, Pill, Row, rowsOf, useRemote, useTab } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';

/**
 * The loyalty hub (Batch 11, merge map section 7): the points balance with the tier and its progress, three link tabs
 * (Rewards, Challenges, Invite friends; `?tab=`) and the points history. One screen in place of rewards, challenges,
 * referrals and the removed leaderboard. GET /loyalty/account, /loyalty/transactions, /loyalty/config (tiers and ways to
 * earn: the server's own), /loyalty/rewards + POST claim, /loyalty/challenges + POST join, /referrals/my + POST apply.
 * Every title, description, tier name and perk is the server's text; the screen adds no rule, no amount and no colour.
 */

const TABS = ['rewards', 'challenges', 'invite'] as const;
type HubTab = (typeof TABS)[number];

const TIER_TONES: ServiceTone[] = [SERVICE_TONES[4], SERVICE_TONES[1], SERVICE_TONES[3], SERVICE_TONES[8], SERVICE_TONES[5]];
const REASONS = ['booking_completed', 'order_delivered', 'review_submitted', 'vitals_logged', 'reward_claimed', 'points_expired', 'referral_converted'];

interface Tier {
  id: string;
  label: string;
  minPts: number;
  perks?: string[];
}
interface EarnWay {
  action: string;
  pts: number | string;
}
interface Config {
  tiers: Tier[];
  earn_ways?: EarnWay[];
}
interface Account {
  points?: number;
  tier?: string;
}
interface Transaction {
  id?: string | number;
  points_delta?: number;
  points?: number;
  reason?: string;
  description?: string;
  createdAt?: string;
}
interface HubData {
  points: number;
  tierId: string;
  tiers: Tier[];
  earnWays: EarnWay[];
  transactions: Transaction[];
}

/** The balance, the tier and its progress to the next tier (only what the server sent). */
export function tierProgress(tiers: Tier[], tierId: string, points: number) {
  const index = Math.max(0, tiers.findIndex((t) => t.id === tierId));
  const current = tiers[index];
  const next = tiers[index + 1];
  const share = current && next && next.minPts > current.minPts ? (points - current.minPts) / (next.minPts - current.minPts) : next ? 0 : 1;
  return { index, current, next, share: Math.min(1, Math.max(0, share)), missing: next ? Math.max(0, next.minPts - points) : 0 };
}

export function LoyaltyHubView() {
  const { k, num } = useScreenUi();
  const [tab, setTab] = useTab<HubTab>(TABS, 'rewards');
  const remote = useRemote<HubData>(
    async () => {
      const account = await apiFetch<Account>('/loyalty/account');
      const history = await apiFetch<{ transactions?: Transaction[] }>('/loyalty/transactions?page=1');
      const config = await apiFetch<Config>('/loyalty/config');
      if (!Array.isArray(config?.tiers) || config.tiers.length === 0) throw new Error('loyalty config has no tiers');
      return {
        points: Number(account?.points) || 0,
        tierId: account?.tier ?? config.tiers[0].id,
        tiers: config.tiers,
        earnWays: Array.isArray(config.earn_ways) ? config.earn_ways : [],
        transactions: Array.isArray(history?.transactions) ? history.transactions : [],
      };
    },
    [],
    'loyalty:hub',
  );
  const data = remote.data;
  const progress = data ? tierProgress(data.tiers, data.tierId, data.points) : null;
  const tone = TIER_TONES[(progress?.index ?? 0) % TIER_TONES.length];

  return (
    <CareScreen title={k('loyalty.title')} testID="loyalty-hub" onRefresh={() => void remote.reload(true)}>
      <Gate status={remote.status} onRetry={() => void remote.reload()} errorTitle={k('loyalty.unavailable')}>
        {data && progress?.current ? (
          <>
            <CareHero
              testID="loyalty-balance"
              tone={tone}
              ring={{ value: progress.share, label: k('loyalty.balanceLabel', { points: num(data.points) }), valueText: num(data.points), caption: k('loyalty.points') }}
              title={progress.current.label}
              lines={progress.next && progress.missing > 0 ? [k('loyalty.toNext', { points: num(progress.missing), tier: progress.next.label })] : []}
            >
              <CareBar value={progress.share} tone={tone} label={k('loyalty.progress')} />
            </CareHero>
            <HealthTabs
              testID="loyalty-tabs"
              tabs={[
                { key: 'rewards', label: k('loyalty.tab.rewards') },
                { key: 'challenges', label: k('loyalty.tab.challenges') },
                { key: 'invite', label: k('loyalty.tab.invite') },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'rewards' ? <RewardsTab points={data.points} data={data} progress={progress} onChanged={() => void remote.reload(true)} /> : null}
            {tab === 'challenges' ? <ChallengesTab /> : null}
            {tab === 'invite' ? <InviteTab /> : null}
            <HistorySection transactions={data.transactions} />
          </>
        ) : null}
      </Gate>
    </CareScreen>
  );
}

interface Reward {
  id?: string;
  _id?: string;
  title?: string;
  title_ar?: string;
  title_en?: string;
  description?: string;
  points_required: number;
  reward_type?: string;
}

function RewardsTab({ points, data, progress, onChanged }: { points: number; data: HubData; progress: ReturnType<typeof tierProgress>; onChanged: () => void }) {
  const { k, num, theme } = useScreenUi();
  const remote = useRemote(async () => rowsOf<Reward>(await apiFetch('/loyalty/rewards')), [], 'loyalty:rewards');
  const [pick, setPick] = useState<Reward | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<string | null | undefined>(undefined);

  const claim = async () => {
    const id = pick?.id ?? pick?._id;
    if (!pick || !id) return;
    setClaiming(true);
    setError(null);
    try {
      const res = await apiFetch<{ coupon_code?: string }>(`/loyalty/rewards/${id}/claim`, { method: 'POST' });
      setCoupon(res?.coupon_code ?? null);
      setPick(null);
      onChanged();
      void remote.reload(true);
    } catch (e) {
      logError('loyalty:claim', e);
      setError(k('loyalty.rewards.claimFailed'));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      {coupon !== undefined ? <Notice tone="success" text={coupon ? k('loyalty.rewards.claimedCode', { code: coupon }) : k('loyalty.rewards.claimed')} testID="loyalty-claimed" /> : null}
      {error ? <Notice tone="danger" text={error} /> : null}
      <Section title={k('loyalty.rewards.title')}>
        <Gate status={remote.status} onRetry={() => void remote.reload()}>
          {remote.data && remote.data.length > 0 ? (
            <Panel>
              {remote.data.map((r, i) => {
                const enough = points >= r.points_required;
                return (
                  <Row
                    key={String(r.id ?? r._id ?? i)}
                    icon="gift"
                    tone="amber"
                    title={r.title ?? r.title_ar ?? r.title_en ?? ''}
                    subtitle={r.description}
                    caption={k('loyalty.pointsAmount', { points: num(r.points_required) })}
                    trailing={<Button label={enough ? k('loyalty.rewards.redeem') : k('loyalty.rewards.notEnough')} size="sm" disabled={!enough} onPress={() => setPick(r)} theme={theme} testID={`loyalty-redeem-${r.id ?? r._id ?? i}`} />}
                    last={i === remote.data!.length - 1}
                  />
                );
              })}
            </Panel>
          ) : (
            <EmptyState icon="gift" tone="amber" title={k('loyalty.rewards.emptyTitle')} body={k('loyalty.rewards.emptyBody')} />
          )}
        </Gate>
      </Section>
      {data.earnWays.length > 0 ? (
        <Section title={k('loyalty.earn.title')}>
          <Panel>
            {data.earnWays.map((way, i) => (
              <Row key={`${way.action}-${i}`} icon="star" tone={TIER_TONES[i % TIER_TONES.length]} title={way.action} caption={k('loyalty.pointsAmount', { points: typeof way.pts === 'number' ? num(way.pts) : way.pts })} last={i === data.earnWays.length - 1} />
            ))}
          </Panel>
        </Section>
      ) : null}
      {progress.current?.perks && progress.current.perks.length > 0 ? (
        <Section title={k('loyalty.perks.title', { tier: progress.current.label })}>
          <Panel>
            {progress.current.perks.map((perk, i) => (
              <Row key={`${perk}-${i}`} icon="check-circle" tone="mint" title={perk} last={i === progress.current!.perks!.length - 1} />
            ))}
          </Panel>
        </Section>
      ) : null}
      {progress.next?.perks && progress.next.perks.length > 0 ? (
        <Section title={k('loyalty.perks.next', { tier: progress.next.label })}>
          <Panel>
            {progress.next.perks.slice(0, 2).map((perk, i, all) => (
              <Row key={`${perk}-${i}`} icon="star" tone="amber" title={perk} last={i === all.length - 1} />
            ))}
          </Panel>
        </Section>
      ) : null}
      <Sheet open={pick !== null} title={k('loyalty.rewards.confirmTitle')} onClose={() => setPick(null)} closeLabel={k('consult.close')}>
        <View style={{ gap: 14 }}>
          <Notice tone="info" text={pick ? k('loyalty.rewards.confirmBody', { points: num(pick.points_required), title: pick.title ?? pick.title_ar ?? pick.title_en ?? '' }) : ''} />
          <Button label={k('loyalty.rewards.redeem')} size="lg" fullWidth loading={claiming} onPress={() => void claim()} theme={theme} testID="loyalty-confirm-claim" />
        </View>
      </Sheet>
    </>
  );
}

interface Challenge {
  id: string;
  title?: string;
  desc?: string;
  description?: string;
  reward_points?: number;
  target_count?: number;
  user_progress?: number;
  completed?: boolean;
  joined?: boolean;
  end_date?: string;
}

function ChallengesTab() {
  const { k, num, theme } = useScreenUi();
  const { date } = useConsultFormat();
  const remote = useRemote(async () => rowsOf<Challenge>(await apiFetch('/loyalty/challenges')), [], 'loyalty:challenges');
  const [joinedNow, setJoinedNow] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const join = async (id: string) => {
    setError(null);
    try {
      await apiFetch(`/loyalty/challenges/${id}/join`, { method: 'POST' });
      setJoinedNow((prev) => ({ ...prev, [id]: true }));
    } catch (e) {
      logError('loyalty:join', e);
      setError(k('loyalty.challenges.joinFailed'));
    }
  };

  return (
    <Gate status={remote.status} onRetry={() => void remote.reload()}>
      {remote.data && remote.data.length > 0 ? (
        <>
          <MetricGrid>
            <MetricTile label={k('loyalty.challenges.joined')} value={num(remote.data.filter((c) => joinedNow[c.id] || c.joined || (c.user_progress ?? 0) > 0 || c.completed).length)} icon="chart-line-up" tone="blue" />
            <MetricTile label={k('loyalty.challenges.completed')} value={num(remote.data.filter((c) => c.completed).length)} icon="check-circle" tone="mint" />
            <MetricTile label={k('loyalty.challenges.earned')} value={num(remote.data.reduce((sum, c) => sum + (c.completed ? Number(c.reward_points) || 0 : 0), 0))} icon="star" tone="amber" />
          </MetricGrid>
          {error ? <Notice tone="danger" text={error} /> : null}
          <Panel>
            {remote.data.map((c, i) => {
              const joined = Boolean(joinedNow[c.id] || c.joined || (c.user_progress ?? 0) > 0 || c.completed);
              const total = Number(c.target_count) || 0;
              const done = Number(c.user_progress) || 0;
              const lines = [c.desc ?? c.description, c.end_date ? k('loyalty.challenges.ends', { date: date(c.end_date) }) : undefined].filter(Boolean) as string[];
              return (
                <View key={c.id}>
                  <Row
                    icon="chart-line-up"
                    tone="pink"
                    title={c.title ?? ''}
                    subtitle={lines[0]}
                    caption={[typeof c.reward_points === 'number' ? k('loyalty.challenges.reward', { points: num(c.reward_points) }) : undefined, c.end_date ? lines[lines.length - 1] : undefined].filter(Boolean).join(' · ') || undefined}
                    trailing={
                      c.completed ? (
                        <Pill tone="success" label={k('loyalty.challenges.done')} />
                      ) : joined ? (
                        <Pill tone="info" label={k('loyalty.challenges.inProgress')} />
                      ) : (
                        <Button label={k('loyalty.challenges.join')} size="sm" onPress={() => void join(c.id)} theme={theme} testID={`loyalty-join-${c.id}`} />
                      )
                    }
                    last={!(joined && total > 0) && i === remote.data!.length - 1}
                  />
                  {joined && total > 0 ? (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 4 }}>
                      <CareBar value={done / total} tone="pink" label={k('loyalty.challenges.progress', { done: num(done), total: num(total) })} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Panel>
        </>
      ) : (
        <EmptyState icon="chart-line-up" tone="pink" title={k('loyalty.challenges.emptyTitle')} body={k('loyalty.challenges.emptyBody')} />
      )}
    </Gate>
  );
}

interface Referrals {
  code?: string;
  stats?: { total: number; registered: number; rewarded: number; earned_points: number };
  invites?: Array<{ id: string; name?: string; status?: string; created_at?: string }>;
}

function InviteTab() {
  const { k, num, theme, t, c, flow } = useScreenUi();
  const { date } = useConsultFormat();
  const remote = useRemote(async () => (await apiFetch<Referrals>('/referrals/my')) ?? {}, [], 'loyalty:referrals');
  const [applyCode, setApplyCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const code = remote.data?.code ?? '';
  const stats = remote.data?.stats ?? { total: 0, registered: 0, rewarded: 0, earned_points: 0 };
  const invites = remote.data?.invites ?? [];

  const share = async () => {
    if (!code) return;
    try {
      await Share.share({ message: k('loyalty.invite.shareMessage', { code }) });
    } catch (e) {
      logError('loyalty:share', e);
    }
  };

  const apply = async () => {
    const value = applyCode.trim();
    if (!value) return;
    setApplying(true);
    setMessage(null);
    try {
      await apiFetch('/referrals/apply', { method: 'POST', body: JSON.stringify({ code: value }) });
      setMessage({ tone: 'success', text: k('loyalty.invite.applied') });
      setApplyCode('');
    } catch (e) {
      logError('loyalty:apply', e);
      setMessage({ tone: 'danger', text: k('loyalty.invite.applyFailed') });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Gate status={remote.status} onRetry={() => void remote.reload()}>
      <Panel>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('loyalty.invite.title')}</Text>
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('loyalty.invite.body')}</Text>
          <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, ...flow }}>{k('loyalty.invite.yourCode')}</Text>
          <Text selectable accessibilityLabel={`${k('loyalty.invite.yourCode')} ${code}`} testID="loyalty-code" style={{ ...scale(t, 'h2'), color: c.action.primary.bg, letterSpacing: 2, textAlign: 'center' }}>
            {code || '—'}
          </Text>
          <Button label={k('loyalty.invite.share')} size="lg" fullWidth disabled={!code} onPress={() => void share()} theme={theme} testID="loyalty-share" />
        </View>
      </Panel>
      <Panel>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ ...scale(t, 'body', 'bold'), color: c.text.primary, ...flow }}>{k('loyalty.invite.haveCode')}</Text>
          <Input value={applyCode} onChange={setApplyCode} placeholder={k('loyalty.invite.codePlaceholder')} label={k('loyalty.invite.codeLabel')} hint={k('loyalty.invite.applyHint')} theme={theme} testID="loyalty-apply-input" />
          {message ? <Notice tone={message.tone} text={message.text} /> : null}
          <Button label={k('loyalty.invite.apply')} variant="outline" size="lg" fullWidth loading={applying} disabled={applyCode.trim() === ''} onPress={() => void apply()} theme={theme} testID="loyalty-apply" />
        </View>
      </Panel>
      <MetricGrid>
        <MetricTile label={k('loyalty.invite.earned')} value={num(stats.earned_points)} unit={k('loyalty.points')} icon="star" tone="amber" />
        <MetricTile label={k('loyalty.invite.total')} value={num(stats.total)} icon="users" tone="blue" />
      </MetricGrid>
      <Section title={k('loyalty.invite.history')}>
        {invites.length === 0 ? (
          <EmptyState icon="users" tone="blue" title={k('loyalty.invite.emptyTitle')} body={k('loyalty.invite.emptyBody')} />
        ) : (
          <Panel>
            {invites.map((inv, i) => {
              const rewarded = inv.status === 'rewarded';
              return (
                <Row
                  key={inv.id}
                  icon="users"
                  tone={rewarded ? 'mint' : 'blue'}
                  title={inv.name ?? ''}
                  subtitle={rewarded ? k('loyalty.invite.status.rewarded') : k('loyalty.invite.status.registered')}
                  caption={date(inv.created_at) || undefined}
                  last={i === invites.length - 1}
                />
              );
            })}
          </Panel>
        )}
      </Section>
    </Gate>
  );
}

function HistorySection({ transactions }: { transactions: Transaction[] }) {
  const { k, num } = useScreenUi();
  const { date } = useConsultFormat();
  return (
    <Section title={k('loyalty.history.title')}>
      {transactions.length === 0 ? (
        <EmptyState icon="star" tone="amber" title={k('loyalty.history.emptyTitle')} body={k('loyalty.history.emptyBody')} />
      ) : (
        <Panel testID="loyalty-history">
          {transactions.map((tx, i) => {
            const delta = Number(tx.points_delta ?? tx.points ?? 0) || 0;
            const reason = tx.reason && REASONS.includes(tx.reason) ? k(`loyalty.reason.${tx.reason}`) : tx.reason;
            return (
              <Row
                key={String(tx.id ?? i)}
                icon="star"
                tone={delta >= 0 ? 'mint' : SERVICE_TONES[0]}
                title={tx.description || reason || ''}
                caption={date(tx.createdAt) || undefined}
                trailing={<Pill tone={delta >= 0 ? 'success' : 'danger'} label={`${delta >= 0 ? '+' : '−'}${num(Math.abs(delta))}`} />}
                last={i === transactions.length - 1}
              />
            );
          })}
        </Panel>
      )}
    </Section>
  );
}
