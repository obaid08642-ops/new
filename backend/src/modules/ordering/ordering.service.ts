import { readQuoteVatRate } from '../../common/quote';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { homeCollectionFee } from '../../common/provider-home-fees';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import { recordAudit } from '../../common/audit-record';
import { buildPatientPolicy, cardCopay, hasInsuranceContract, policyClass, policyCompanyKeys } from '../../common/insurance-policy';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { LabsService } from '../labs/labs.service';
import { MedicalOrdersService } from '../medical-orders/medical-orders.service';
import { CreateOrderingBookingDto, QuoteDto, WindowsQueryDto } from './ordering.dto';
import {
  reliabilityRates, areaKey, Candidate, haversineKm, homeWindows, isOfferedWindow, Mode, mergeWeights, rank, round1, round2, sortCompare, suggestSplit, totalOf,
} from './ordering-engine';

// M3 ordering engine API (docs/product/ORDERING_MODEL_2026-10-16.md, phase M3). Quote -> windows -> one booking group.
// The quote is a server-side snapshot owned by the patient: the booking is made from it, never from client-sent prices.
// Public provider ids are the provider profile ids; account ids, phone numbers and e-mails never leave this service.

export type Kind = 'lab' | 'radiology' | 'nursing';
type Coverage = 'covered' | 'needs_approval' | 'not_covered';

const QUOTES = 'ordering_quotes';
const GROUPS = 'order_groups';
const GAPS = 'coverage_gaps';
export const LIFECYCLE = 'ordering_lifecycle';
const SETTINGS = 'provider_ordering_settings';
const ITEMS = 'provider_ordering_items';
export const KIND_CATALOG: Record<Kind, string> = {
  lab: CATALOG_COLLECTIONS.lab_services,
  radiology: CATALOG_COLLECTIONS.radiology_services,
  nursing: CATALOG_COLLECTIONS.nursing_services,
};
const ORDER_GROUP: Record<Kind, 'labs' | 'radiology' | 'nursing'> = { lab: 'labs', radiology: 'radiology', nursing: 'nursing' };
const QUOTE_TTL_MS = 30 * 60_000;
const PURGE_AFTER_MS = 24 * 3_600_000;
export { cardCopay };

/** min(price x percent, cap) on each covered item, the full price on an uncovered one, plus whatever is not an item (the home fee). */
export function estimatePatientShare(items: Array<{ price: number; covered: boolean }>, copay: { percent: number; cap: number | null }, extras = 0): number {
  const part = items.reduce((sum, it) => {
    if (!it.covered) return sum + it.price;
    const share = it.price * (copay.percent / 100);
    return sum + (copay.cap === null ? share : Math.min(share, copay.cap));
  }, 0);
  return Math.round((part + extras) * 100) / 100;
}

const DEFAULT_INSURANCE_RATE = 0.8; // share of a covered item the insurer is expected to pay; owner-editable `ordering_insurance_share_rate`

const bad = (code: string) => new BadRequestException(code);

export interface Snapshot { account_id: string; auto_accept: boolean; prices: Record<string, number>; home_fee: number; in_network: boolean; coverage: Record<string, Coverage>; walk_in: boolean; staff_genders: string[] }
interface QuoteGroup { mode: Mode; items: Array<{ catalog_id: string; facility_only?: true }>; candidates: Record<string, Snapshot>; names: Record<string, { ar: string | null; en: string | null }> }

/** The breakdown the clients show for one quoted provider: the home fee inside the total, and the VAT in it (prices are VAT-inclusive). */
export function quoteBreakdown(total: number, homeFee: unknown, vatRate: number | null) {
  // vatRate null = the platform is not VAT-registered: no VAT line, subtotal = total
  const vat = vatRate === null ? null : round2(total - total / (1 + vatRate));
  return { home_fee: round2(Number(homeFee) || 0), vat_rate: vatRate, vat, subtotal: vat === null ? round2(total) : round2(total - vat), tax_registered: vatRate !== null };
}

@Injectable()
export class OrderingService implements OnModuleInit {
  private readonly logger = new Logger(OrderingService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly labs: LabsService,
    private readonly medicalOrders: MedicalOrdersService,
  ) {}

  /** Indexes of the three collections of this module, created from the start. Idempotent. */
  async onModuleInit() {
    const q = this.conn.collection(QUOTES);
    await q.createIndex({ id: 1 }, { unique: true, name: 'ordering_quote_id_unique' });
    await q.createIndex({ patient_id: 1, created_at: -1 }, { name: 'ordering_quote_patient' });
    await q.createIndex({ purge_at: 1 }, { expireAfterSeconds: 0, name: 'ordering_quote_ttl' });
    const g = this.conn.collection(GROUPS);
    await g.createIndex({ id: 1 }, { unique: true, name: 'order_group_id_unique' });
    await g.createIndex({ quote_id: 1 }, { unique: true, name: 'order_group_quote_unique' });
    await g.createIndex({ patient_id: 1, created_at: -1 }, { name: 'order_group_patient' });
    const lc = this.conn.collection(LIFECYCLE);
    await lc.createIndex({ booking_id: 1 }, { unique: true, name: 'lifecycle_booking_unique' });
    await lc.createIndex({ confirm_deadline_at: 1 }, { name: 'lifecycle_due' });
    await this.conn.collection(GAPS).createIndex({ service_kind: 1, mode: 1, area_key: 1 }, { unique: true, name: 'coverage_gap_cell_unique' });
  }

  // ---------- quote ----------

  async quote(user: { id: string }, dto: QuoteDto) {
    const { service_kind: kind, context } = dto;
    const items = [...new Set(dto.items)];
    const catalog = await this.conn.collection(KIND_CATALOG[kind]).find({ id: { $in: items } }).toArray();
    const byId = new Map(catalog.map((c: any) => [c.id as string, c]));
    if (items.some((id) => !byId.has(id))) throw bad('unknown_catalog_item');
    if (context.family_member_id) await this.ownMember(user.id, context.family_member_id);

    const policy = await this.policyOf(user.id, context.payer, context.family_member_id);
    const weights = mergeWeights((await this.conn.collection('system_configs').findOne({ key: 'ordering_ranking_weights' }))?.value);
    const shareRate = await this.shareRate();
    const vatRate = await readQuoteVatRate(this.conn);

    // a mixed basket is split automatically: what cannot be done at home goes to a facility group, labelled
    const homeIds: string[] = [];
    const facilityIds: string[] = [];
    const facilityOnly = new Set<string>();
    for (const id of items) {
      const c: any = byId.get(id);
      const homeOk = context.mode === 'home' && (kind === 'radiology' ? c.portable_ultrasound === true : c.home_visit_supported !== false);
      if (homeOk) homeIds.push(id);
      else { facilityIds.push(id); if (context.mode === 'home') facilityOnly.add(id); }
    }
    const plan: Array<{ mode: Mode; ids: string[] }> = [];
    if (homeIds.length) plan.push({ mode: 'home', ids: homeIds });
    if (facilityIds.length) plan.push({ mode: 'facility', ids: facilityIds });

    const now = new Date();
    const sections: any[] = [];
    const stored: QuoteGroup[] = [];
    for (const step of plan) {
      const found = await this.findCandidates(kind, step.mode, step.ids, context, policy, now);  // context carries staff_gender
      const full = found.cands.filter((c) => step.ids.every((id) => c.prices[id] != null));
      const ranked = rank(full, step.ids, step.mode, context.payer, weights);
      // every mode-eligible provider is listed: full coverers first (ranked), then the partial ones, flagged with what they lack
      const partial = found.cands.filter((c) => !full.includes(c));
      const partialRows = sortCompare(rank(partial, step.ids, step.mode, context.payer, weights), dto.sort);
      const compare = [...sortCompare(ranked, dto.sort), ...partialRows];
      const best = ranked[0] ?? null;
      const split = best ? null : suggestSplit(found.cands, step.ids, step.mode);
      const empty = best || split ? null : await this.emptyResult(kind, step.mode, step.ids, context, policy, now);
      if (empty) await this.recordGap(kind, step.mode, context.lat, context.lng);
      const row = (x: { c: Candidate; total: number }) => ({
        ...(step.ids.every((id) => x.c.prices[id] != null) ? {} : { covers_all: false, missing: step.ids.filter((id) => x.c.prices[id] == null) }),
        provider_id: x.c.provider_id, name_ar: x.c.name_ar, name_en: x.c.name_en, total: x.total, distance_km: round1(x.c.distance_km),
        // the breakdown the clients show, stated by the server: the home-collection fee inside the total, and the VAT in it
        ...quoteBreakdown(x.total, x.c.home_fee, vatRate),
        rating: x.c.rating, in_network: x.c.in_network, earliest_at: x.c.earliest_at.toISOString(), turnaround_hours: x.c.turnaround_hours,
      });
      sections.push({
        mode: step.mode,
        items: step.ids.map((id) => (facilityOnly.has(id) ? { catalog_id: id, facility_only: true as const } : { catalog_id: id })),
        from_price: ranked.length ? { total: Math.min(...ranked.map((x) => x.total)), providers_count: ranked.length } : null,
        best_match: best ? { ...row(best), ...this.shares(best.c, step.ids, step.mode, context.payer, shareRate, policy?.copay ?? null) } : null,
        compare: compare.map(row),
        split_suggestion: split ? { assignments: split.assignments, total: split.total } : null,
        empty,
      });
      stored.push({
        mode: step.mode,
        items: step.ids.map((id) => (facilityOnly.has(id) ? { catalog_id: id, facility_only: true as const } : { catalog_id: id })),
        candidates: Object.fromEntries(full.map((c) => [c.provider_id, found.snapshot[c.provider_id]])),
        names: Object.fromEntries(step.ids.map((id) => [id, { ar: (byId.get(id) as any).name_ar ?? null, en: (byId.get(id) as any).name_en ?? null }])),
      });
    }

    const quote_id = `oq_${randomUUID()}`;
    await this.conn.collection(QUOTES).insertOne({
      id: quote_id, patient_id: user.id, service_kind: kind, payer: context.payer, family_member_id: context.family_member_id ?? null,
      context: { mode: context.mode, lat: context.lat, lng: context.lng }, groups: stored,
      created_at: now, expires_at: new Date(now.getTime() + QUOTE_TTL_MS), purge_at: new Date(now.getTime() + QUOTE_TTL_MS + PURGE_AFTER_MS),
    } as never);

    const first = sections[0];
    const priced = sections.every((s) => s.from_price);
    return {
      quote_id,
      expires_at: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
      estimate: context.payer === 'insurance' ? true : undefined,
      groups: sections,
      // one number for the whole basket (the sum of each group's lowest total); the lists below are the first group's
      from_price: priced ? { total: round2(sections.reduce((s, x) => s + x.from_price.total, 0)), providers_count: Math.min(...sections.map((x) => x.from_price.providers_count)) } : null,
      best_match: first.best_match,
      compare: first.compare,
      split_suggestion: first.split_suggestion,
      empty: sections.find((s) => s.empty)?.empty ?? null,
    };
  }

  /**
   * The saved company and class for an insurance quote; null for cash. With `memberId` it is the family member's own policy
   * (never the account holder's: it is another person), after checking the member belongs to the caller.
   */
  async policyOf(userId: string, payer: 'cash' | 'insurance', memberId?: string | null): Promise<{ keys: string[]; cls: string; copay: { percent: number; cap: number | null } | null } | null> {
    if (payer !== 'insurance') return null;
    let insurance: unknown;
    if (memberId) {
      const m: any = await this.ownMember(userId, memberId);
      insurance = m.insurance;
    } else {
      insurance = ((await this.conn.collection('patient_profiles').findOne({ user_id: userId }, { projection: { insurance: 1 } })) as any)?.insurance;
    }
    const keys = policyCompanyKeys(insurance);
    const cls = policyClass(insurance);
    if (!keys.length || !cls) throw bad('insurance_not_saved');
    return { keys, cls, copay: cardCopay(insurance) };
  }

  private async ownMember(userId: string, id: string) {
    const m = await this.conn.collection('family_members').findOne({ id, $or: [{ owner_id: userId }, { user_id: userId }, { patient_id: userId }] });
    if (!m) throw new NotFoundException('family_member_not_found');
    return m;
  }

  /** M5: a family member carries their own policy; the class is required, as for the account holder (D-30). */
  async setMemberInsurance(userId: string, memberId: string, body: { provider?: string; class?: string; policy_number?: string }) {
    await this.ownMember(userId, memberId);
    if (!body.provider?.trim()) throw bad('insurance_details_required');
    if (!body.class?.trim()) throw bad('insurance_class_required');
    await this.conn.collection('family_members').updateOne(
      { id: memberId },
      { $set: { insurance: { ...buildPatientPolicy(null, { provider: body.provider, class: body.class, policy_number: body.policy_number }, null), updated_at: new Date() } } },
    );
    return { success: true, verified: false };
  }

  async confirmDeadlineSeconds(): Promise<number> {
    const v = (await this.conn.collection('system_configs').findOne({ key: 'ordering_confirm_deadline_seconds' }))?.value;
    return typeof v === 'number' && v >= 1 && v <= 86_400 ? v : 900;
  }

  /** The booking's lifecycle record: the confirm deadline (none for an insured booking, which waits for the approval), the arrival code, the lock. */
  async registerLifecycle(bookingId: string, patientId: string, providerAccountId: string, quoteId: string, deadline: Date | null, confirmed = false) {
    await this.conn.collection(LIFECYCLE).updateOne(
      { booking_id: bookingId },
      { $setOnInsert: { booking_id: bookingId, patient_id: patientId, provider_account_id: providerAccountId, quote_id: quoteId, confirm_deadline_at: deadline, confirmed_at: confirmed ? new Date() : null, created_at: new Date() } },
      { upsert: true },
    );
  }

  /** Reliability 0..1 per provider from its record (acceptance, on time, cancellations); a provider with no record has none yet. */
  async reliabilityOf(accounts: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!accounts.length) return out;
    const rows = await this.conn.collection('provider_reliability').find({ provider_account_id: { $in: accounts } }).toArray() as any[];
    for (const r of rows) {
      const rates = reliabilityRates(r);
      out.set(r.provider_account_id, round2(0.4 * rates.acceptance_rate + 0.4 * rates.on_time_rate + 0.2 * (1 - rates.cancellation_rate)));
    }
    return out;
  }

  /** One counter of a provider's record moves; the record is created on first use. */
  async bump(accountId: string, field: 'offered' | 'accepted' | 'completed' | 'on_time' | 'cancellations') {
    try {
      await this.conn.collection('provider_reliability').updateOne({ provider_account_id: accountId }, { $inc: { [field]: 1 }, $set: { updated_at: new Date() }, $setOnInsert: { provider_account_id: accountId } }, { upsert: true });
    } catch (e) {
      this.logger.warn(`reliability not updated: ${(e as Error).message}`);
    }
  }

  async shareRate(): Promise<number> {
    const v = (await this.conn.collection('system_configs').findOne({ key: 'ordering_insurance_share_rate' }))?.value;
    return typeof v === 'number' && v >= 0 && v <= 1 ? v : DEFAULT_INSURANCE_RATE;
  }

  /** Estimated insurer share on the items (never on the home fee); the patient pays the rest. */
  private shares(c: Candidate, ids: string[], mode: Mode, payer: 'cash' | 'insurance', rate: number, copay: { percent: number; cap: number | null } | null = null) {
    const total = totalOf(c, ids, mode);
    const lines = ids.map((id) => ({ catalog_id: id, price: c.prices[id], ...(payer === 'insurance' ? { coverage: c.coverage[id] ?? 'not_covered' } : {}) }));
    const insured = payer === 'insurance'
      ? round2(lines.reduce((s, l) => s + (l.coverage === 'not_covered' ? 0 : l.price * rate), 0))
      : 0;
    // The patient's own card figures (owner decision 2026-10-24), only when they filled them AND this provider accepts their company and class.
    // An estimate from what is printed on the card, never a final price: the provider decides after the insurer answers.
    const own = payer === 'insurance' && copay && c.in_network ? estimatePatientShare(lines.map((l) => ({ price: l.price, covered: l.coverage !== 'not_covered' })), copay, total - lines.reduce((sum, l) => sum + l.price, 0)) : null;
    return { items: lines, estimated_insurance_share: insured, patient_share: round2(total - insured), estimated_patient_share: own, estimated_patient_share_basis: own === null ? null : ('card_copay' as const) };
  }

  /** Providers that declared the mode, are live, and (home) cover the patient's point; with their prices for the given items. */
  async findCandidates(kind: Kind, mode: Mode, ids: string[] | null, ctx: { lat: number; lng: number; payer: 'cash' | 'insurance'; staff_gender?: 'female' | 'male' }, policy: { keys: string[]; cls: string } | null, now: Date) {
    const settings = await this.conn.collection(SETTINGS).find({ modes: mode }).toArray() as any[];
    const accounts = settings.map((s) => s.provider_account_id as string);
    const reliability = await this.reliabilityOf(accounts);
    if (!accounts.length) return { cands: [] as Candidate[], snapshot: {} as Record<string, Snapshot> };
    const [profiles, approved, rows] = await Promise.all([
      this.conn.collection('provider_profiles').find({ account_id: { $in: accounts }, status: { $in: ['active', 'ACTIVE'] }, public_eligibility: true }).toArray() as Promise<any[]>,
      this.conn.collection('provider_accounts').find({ id: { $in: accounts }, status: { $in: ['approved', 'active', 'APPROVED', 'ACTIVE'] } }, { projection: { id: 1 } }).toArray() as Promise<any[]>,
      this.conn.collection(ITEMS).find({ provider_account_id: { $in: accounts }, service_kind: kind, ...(ids ? { catalog_id: { $in: ids } } : {}), available: { $ne: false } }).toArray() as Promise<any[]>,
    ]);
    const live = new Set(approved.map((a) => a.id as string));
    const itemsBy = new Map<string, any[]>();
    for (const r of rows) itemsBy.set(r.provider_account_id, [...(itemsBy.get(r.provider_account_id) ?? []), r]);
    const settingsBy = new Map(settings.map((s) => [s.provider_account_id as string, s]));
    const cands: Candidate[] = [];
    const snapshot: Record<string, Snapshot> = {};
    const platformHome = kind === 'lab' ? await this.labs.platformHomeFee() : 0;
    for (const p of profiles) {
      if (!live.has(p.account_id)) continue;
      const s = settingsBy.get(p.account_id);
      const lat = p.geo?.lat ?? p.location?.lat;
      const lng = p.geo?.lng ?? p.location?.lng;
      if (!s || typeof lat !== 'number' || typeof lng !== 'number') continue;
      if (ctx.staff_gender && !(Array.isArray(s.staff_genders) && s.staff_genders.includes(ctx.staff_gender))) continue;
      const distance = haversineKm(ctx.lat, ctx.lng, lat, lng);
      if (mode === 'home' && !(typeof s.home_radius_km === 'number' && distance <= s.home_radius_km)) continue;
      const prices: Record<string, number> = {};
      const coverage: Record<string, Coverage> = {};
      let turnaround: number | null = null;
      for (const it of itemsBy.get(p.account_id) ?? []) {
        if (Array.isArray(it.modes) && !it.modes.includes(mode)) continue;
        const price = it.prices?.[mode];
        if (typeof price !== 'number') continue;
        prices[it.catalog_id] = price;
        if (typeof it.turnaround_hours === 'number') turnaround = Math.max(turnaround ?? 0, it.turnaround_hours);
        if (policy) {
          const contracts = Array.isArray(it.accepted_insurance) ? it.accepted_insurance : s.accepted_insurance;
          const ok = hasInsuranceContract(contracts, policy.keys, policy.cls);
          coverage[it.catalog_id] = !ok ? 'not_covered' : mode === 'facility' && kind !== 'radiology' ? 'covered' : 'needs_approval';
        }
      }
      if (!Object.keys(prices).length) continue;
      const inNetwork = !!policy && hasInsuranceContract(s.accepted_insurance, policy.keys, policy.cls);
      // a home lab visit is charged the provider's own fee (their ordering setting, else the one typed at registration), else the platform's
      const homeFee = mode !== 'home' ? 0 : typeof s.home_fee === 'number' ? s.home_fee : kind === 'lab' ? homeCollectionFee(p, platformHome) : 0;
      cands.push({
        provider_id: p.id, name_ar: p.name_ar ?? null, name_en: p.name_en ?? null,
        rating: typeof p.rating === 'number' ? p.rating : null, reliability: reliability.get(p.account_id) ?? null,
        distance_km: distance, in_network: inNetwork, prices, home_fee: homeFee, turnaround_hours: turnaround, earliest_at: now, coverage,
      });
      snapshot[p.id] = {
        account_id: p.account_id, auto_accept: s.auto_accept === true, prices, home_fee: homeFee, in_network: inNetwork, coverage,
        walk_in: s.walk_in === true, staff_genders: Array.isArray(s.staff_genders) ? s.staff_genders : [],
      };
    }
    return { cands, snapshot };
  }

  private async emptyResult(kind: Kind, mode: Mode, ids: string[], ctx: { lat: number; lng: number; payer: 'cash' | 'insurance' }, policy: { keys: string[]; cls: string } | null, now: Date) {
    const alternatives: Array<Record<string, unknown>> = [];
    if (mode === 'home') {
      const nearby = await this.findCandidates(kind, 'facility', ids, ctx, policy, now);
      const full = nearby.cands.filter((c) => ids.every((id) => c.prices[id] != null));
      if (full.length) alternatives.push({ type: 'facility_nearby', providers_count: full.length, nearest_km: round1(Math.min(...full.map((c) => c.distance_km))) });
    }
    alternatives.push({ type: 'broadcast' }, { type: 'notify_me' });
    return { reason: 'no_provider', alternatives };
  }

  /** The admin's view of unmet demand: one counter per service, mode and ~1 km cell; no person, no item list. */
  private async recordGap(kind: Kind, mode: Mode, lat: number, lng: number) {
    try {
      await this.conn.collection(GAPS).updateOne(
        { service_kind: kind, mode, area_key: areaKey(lat, lng) },
        { $inc: { count: 1 }, $set: { last_at: new Date() }, $setOnInsert: { first_at: new Date() } },
        { upsert: true },
      );
    } catch (e) {
      this.logger.warn(`coverage gap not recorded: ${(e as Error).message}`);
    }
  }

  // ---------- windows ----------

  async windows(q: WindowsQueryDto) {
    const profile: any = await this.conn.collection('provider_profiles').findOne({ id: q.provider_id, status: { $in: ['active', 'ACTIVE'] }, public_eligibility: true });
    if (!profile) throw new NotFoundException('provider_not_found');
    const s: any = await this.conn.collection(SETTINGS).findOne({ provider_account_id: profile.account_id });
    if (!s || !Array.isArray(s.modes) || !s.modes.includes(q.mode)) throw bad('mode_not_offered');
    if (q.mode === 'home') {
      return { windows: [{ asap: true }, ...homeWindows(new Date(), 3)] };
    }
    if (s.walk_in === true) return { walk_in: true, qr: true };
    const date = q.date ?? new Date().toISOString().slice(0, 10);
    const day: any = await this.labs.slotsForProvider(profile.account_id, date).catch(() => ({ slots: [] }));
    return { date, slots: (day.slots ?? []).filter((x: any) => x.available).map((x: any) => ({ id: x.id, start: x.start, end: x.end })) };
  }

  // ---------- booking ----------

  async book(user: any, dto: CreateOrderingBookingDto) {
    const quote: any = await this.conn.collection(QUOTES).findOne({ id: dto.quote_id, patient_id: user.id });
    if (!quote) throw new NotFoundException('quote_not_found');
    const now = new Date();
    if (new Date(quote.expires_at).getTime() <= now.getTime()) throw new ConflictException('quote_expired');
    if (quote.service_kind !== 'lab') throw bad('service_kind_not_bookable_yet');
    const groups: QuoteGroup[] = quote.groups;

    for (const mode of ['home', 'facility'] as Mode[]) {
      if (dto.selections[mode] && !groups.some((g) => g.mode === mode)) throw bad('mode_not_in_quote');
    }
    // every check runs before anything is written
    const plan = groups.map((g) => {
      const sel = dto.selections[g.mode];
      if (!sel) throw bad('selection_required');
      if (!Object.prototype.hasOwnProperty.call(g.candidates, sel.provider_id)) throw bad('provider_not_candidate');
      const snap = g.candidates[sel.provider_id];
      return { g, sel, snap };
    });
    const insured = quote.payer === 'insurance';
    if (insured !== (dto.payment_method === 'insurance')) throw bad('payment_method_mismatch');
    if (dto.payment_method === 'cash' && plan.some((p) => p.g.mode === 'home')) throw bad('cash_not_allowed_for_home');

    const scheduled = plan.map(({ g, sel, snap }) => {
      if (g.mode === 'home') {
        const w = sel.window;
        if (w?.asap === true) return { at: now, asap: true };
        if (!w || !isOfferedWindow(now, w.start, w.end)) throw bad('window_not_offered');
        return { at: new Date(w.start as string), asap: false };
      }
      return { at: now, asap: false, needsSlot: !(sel.walk_in === true && snap.walk_in) };
    });
    for (let i = 0; i < plan.length; i++) {
      const s = scheduled[i] as { at: Date; asap: boolean; needsSlot?: boolean };
      if (!s.needsSlot) continue;
      const slot = plan[i].sel.slot_id;
      if (!slot) throw bad('slot_required');
      const day: any = await this.labs.slotsForProvider(plan[i].snap.account_id, slot.slice(0, 10)).catch(() => ({ slots: [] }));
      const hit = (day.slots ?? []).find((x: any) => x.id === slot && x.available);
      if (!hit) throw bad('slot_not_available');
      s.at = new Date(hit.start);
    }
    if (dto.gender_preference) {
      for (const p of plan) {
        if (p.g.mode === 'home' && p.snap.staff_genders.length && !p.snap.staff_genders.includes(dto.gender_preference)) throw bad('gender_not_available');
      }
    }
    const allIds = plan.flatMap((p) => p.g.items.map((i) => i.catalog_id));
    const order = insured ? await this.insuredEvidence(user.id, dto, allIds) : null;

    // the quote is used once: the unique index on quote_id is the claim, taken before the bookings are written
    const groupId = `og_${randomUUID()}`;
    try {
      await this.conn.collection(GROUPS).insertOne({ id: groupId, patient_id: user.id, quote_id: quote.id, service_kind: 'lab', status: 'creating', created_at: now } as never);
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw new ConflictException('quote_already_booked');
      throw e;
    }
    const created: Array<{ id: string; mode: Mode; status: string; provider_id: string; items: Array<{ catalog_id: string; price: number; coverage?: Coverage }>; estimate?: true; total: number; price_locked_at: Date }> = [];
    try {
      for (let i = 0; i < plan.length; i++) {
        const { g, sel, snap } = plan[i];
        const awaiting = insured; // every insured booking, home or in-centre, waits for the provider's item decisions before it is confirmed and paid
        const b: any = await this.labs.createPriced(user, {
          provider_account_id: snap.account_id, mode: g.mode,
          items: g.items.map((it) => ({ service_id: it.catalog_id, name_ar: g.names[it.catalog_id]?.ar ?? undefined, name_en: g.names[it.catalog_id]?.en ?? undefined, price: snap.prices[it.catalog_id], coverage: insured ? snap.coverage[it.catalog_id] : undefined })),
          home_fee: snap.home_fee, scheduled_at: scheduled[i].at, asap: scheduled[i].asap, payment_method: dto.payment_method, awaiting_approval: awaiting,
          address: g.mode === 'home' ? { lat: quote.context.lat, lng: quote.context.lng } : undefined,
          order_group_id: groupId, quote_id: quote.id, medical_order_id: order?.id, gender_preference: dto.gender_preference,
          documents: dto.documents, notes: dto.notes,
        });
        created.push({
          id: b.id, mode: g.mode, status: awaiting ? 'awaiting_approval' : 'pending', provider_id: sel.provider_id,
          items: g.items.map((it) => ({ catalog_id: it.catalog_id, price: snap.prices[it.catalog_id], ...(insured ? { coverage: snap.coverage[it.catalog_id] ?? 'not_covered' } : {}) })), ...(insured ? { estimate: true } : {}), total: b.total, price_locked_at: b.price_locked_at,
        });
      }
    } catch (e) {
      // nothing half-made stays claimed: the patient can retry the same quote
      await this.conn.collection(GROUPS).deleteOne({ id: groupId, patient_id: user.id, status: 'creating' });
      throw e;
    }
    const deadline = await this.confirmDeadlineSeconds();
    for (let i = 0; i < created.length; i++) {
      await this.registerLifecycle(created[i].id, user.id, plan[i].snap.account_id, quote.id, insured ? null : new Date(now.getTime() + deadline * 1000));
      await this.bump(plan[i].snap.account_id, 'offered');
    }
    const amount = round2(created.reduce((s, c) => s + c.total, 0));
    const payment = { amount, status: 'pending' as const, method: dto.payment_method };
    await this.conn.collection(GROUPS).updateOne(
      { id: groupId, patient_id: user.id },
      { $set: { status: 'open', payment, bookings: created.map((c) => ({ booking_id: c.id, mode: c.mode, provider_id: c.provider_id, total: c.total })) } },
    );
    if (order) for (let i = 0; i < plan.length; i++) await this.linkOrder(user, order, created[i].id, plan[i].g.items.map((it) => it.catalog_id));
    await recordAudit(this.conn, { action: 'ordering.group_created', user_id: user.id, role: 'patient', resource_kind: 'order_group', resource_id: groupId, details: { bookings: created.length, amount, payer: quote.payer } });
    return { order_group_id: groupId, bookings: created, payment: { amount, status: payment.status } };
  }

  /** Insured labs and radiology need the doctor's order (or an uploaded request / pre-authorisation). */
  private async insuredEvidence(userId: string, dto: CreateOrderingBookingDto, catalogIds: string[]): Promise<{ id: string; items: any[] } | null> {
    if (dto.medical_order_id) {
      const o: any = await this.conn.collection('medical_orders').findOne({ id: dto.medical_order_id, patient_id: userId });
      if (!o || o.status !== 'active') throw new NotFoundException('medical_order_not_found');
      if (!o.valid_until || new Date(o.valid_until).getTime() <= Date.now()) throw bad('medical_order_expired');
      const open = (o.items ?? []).filter((i: any) => i.group === 'labs' && (i.status === 'open' || i.status === 'later'));
      if (!catalogIds.every((id) => open.some((i: any) => i.catalog_id === id))) throw bad('medical_order_items_mismatch');
      return { id: o.id, items: open };
    }
    if ((dto.documents ?? []).some((d) => d.kind === 'doctor_request' || d.kind === 'preauth')) return null;
    throw bad('medical_order_required');
  }

  private async linkOrder(user: { id: string }, order: { id: string; items: any[] }, bookingId: string, catalogIds: string[]) {
    for (const item of order.items.filter((i: any) => catalogIds.includes(i.catalog_id))) {
      try {
        await this.medicalOrders.linkBooking(user, order.id, item.id, { booking_id: bookingId, booking_kind: 'lab' });
      } catch (e) {
        this.logger.warn(`medical order item not linked: ${(e as Error).message}`);
      }
    }
  }
}
