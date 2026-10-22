import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import { recordAudit } from '../../common/audit-record';
import { LabsService } from '../labs/labs.service';
import { AsapDto, BroadcastOfferDto, PhotoOrderDto } from './ordering.dto';
import { homeWindows, round1, round2 } from './ordering-engine';
import { KIND_CATALOG, Kind, OrderingService } from './ordering.service';

// M4: ASAP home visits and photo orders, as a staged broadcast to the providers around the patient
// (docs/product/ORDERING_MODEL_2026-10-16.md phase M4). The pharmacy broadcast stays as it is; this one reads
// SystemConfig `ordering_asap_stages`. Every state change is a compare-and-set on the broadcast document, so the first
// acceptance wins across API processes and a stage moves once.

const BROADCASTS = 'ordering_broadcasts';
const OFFERS = 'ordering_offers';
const SETTINGS = 'provider_ordering_settings';
const ITEMS = 'provider_ordering_items';
const DEFAULT_STAGES = [{ radius_km: 3, timeout_seconds: 180 }, { radius_km: 5, timeout_seconds: 180 }, { radius_km: 8, timeout_seconds: 180 }];
const MAX_STAGES = 3;
const PHOTO_OPEN_MS = 24 * 3_600_000;
const PURGE_MS = 30 * 86_400_000;

const bad = (code: string) => new BadRequestException(code);
type Stage = { radius_km: number; timeout_seconds: number };

interface Reached { account_id: string; public_id: string; distance_km: number; auto_accept: boolean }
interface Broadcast {
  id: string; kind: 'asap' | 'photo'; patient_id: string; service_kind: Kind; items: string[]; lat: number; lng: number; payer: 'cash' | 'insurance';
  status: 'broadcasting' | 'awaiting_offers' | 'accepted' | 'expired' | 'cancelled'; open: boolean;
  stage: number; stages: Stage[]; stage_started_at: Date; stage_ends_at: Date; reached: Reached[];
  accepted_by?: string; accepted_account_id?: string; booking_id?: string; accepted_offer_id?: string;
  fallback?: { earliest_window: { provider_id: string; start: string; end: string } | null };
  upload_id?: string; created_at: Date; expires_at?: Date;
}

@Injectable()
export class OrderingBroadcastService implements OnModuleInit {
  private readonly logger = new Logger(OrderingBroadcastService.name);
  private ticking = false;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly ordering: OrderingService,
    private readonly labs: LabsService,
  ) {}

  private col() { return this.conn.collection<any>(BROADCASTS); }
  private offers() { return this.conn.collection<any>(OFFERS); }

  async onModuleInit() {
    const b = this.col();
    await b.createIndex({ id: 1 }, { unique: true, name: 'broadcast_id_unique' });
    // one open ASAP and one open photo order per patient, enforced by the database
    await b.createIndex({ patient_id: 1, kind: 1 }, { unique: true, partialFilterExpression: { open: true }, name: 'broadcast_one_open_per_patient' });
    await b.createIndex({ 'reached.account_id': 1, open: 1 }, { name: 'broadcast_reached_open' });
    await b.createIndex({ open: 1, stage_ends_at: 1 }, { name: 'broadcast_due' });
    await b.createIndex({ purge_at: 1 }, { expireAfterSeconds: 0, name: 'broadcast_ttl' });
    const o = this.offers();
    await o.createIndex({ id: 1 }, { unique: true, name: 'offer_id_unique' });
    await o.createIndex({ broadcast_id: 1, provider_account_id: 1 }, { unique: true, name: 'offer_one_per_provider' });
    await o.createIndex({ purge_at: 1 }, { expireAfterSeconds: 0, name: 'offer_ttl' });
  }

  /** Moves due stages on in the worker; any API process also does it when a broadcast is read (see `advance`). */
  @Interval(5_000)
  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.advanceDue();
    } catch (e) {
      this.logger.warn(`broadcast tick failed: ${(e as Error).message}`);
    } finally {
      this.ticking = false;
    }
  }

  private async stagesConfig(): Promise<Stage[]> {
    const v = (await this.conn.collection('system_configs').findOne({ key: 'ordering_asap_stages' }))?.value;
    if (Array.isArray(v)) {
      const ok = v.filter((s: any) => s && typeof s.radius_km === 'number' && s.radius_km > 0 && s.radius_km <= 100
        && typeof s.timeout_seconds === 'number' && s.timeout_seconds >= 1 && s.timeout_seconds <= 3600)
        .slice(0, MAX_STAGES).map((s: any) => ({ radius_km: s.radius_km, timeout_seconds: s.timeout_seconds }));
      if (ok.length) return ok;
    }
    return DEFAULT_STAGES;
  }

  // ---------- ASAP ----------

  async startAsap(user: { id: string }, dto: AsapDto) {
    const items = [...new Set(dto.items)];
    if (!items.length) throw bad('asap_items_required');
    await this.assertHomeItems(dto.service_kind, items);
    const policy = await this.ordering.policyOf(user.id, dto.payer);
    const stages = await this.stagesConfig();
    const now = new Date();
    const doc: Broadcast & { purge_at: Date } = {
      id: `ab_${randomUUID()}`, kind: 'asap', patient_id: user.id, service_kind: dto.service_kind, items, lat: dto.lat, lng: dto.lng, payer: dto.payer,
      status: 'broadcasting', open: true, stage: 1, stages, stage_started_at: now, stage_ends_at: new Date(now.getTime() + stages[0].timeout_seconds * 1000),
      reached: [], created_at: now, purge_at: new Date(now.getTime() + PURGE_MS),
    };
    await this.insertOpen(doc, 'asap_open');
    const after = await this.enterStage(doc, policy);
    return this.shape(after, true);
  }

  async getAsap(user: { id: string }, id: string) {
    const b = await this.col().findOne({ id, patient_id: user.id, kind: 'asap' });
    if (!b) throw new NotFoundException('asap_not_found');
    return this.shape(await this.advance(b as unknown as Broadcast), false);
  }

  async cancelAsap(user: { id: string }, id: string) {
    const b = await this.col().findOneAndUpdate({ id, patient_id: user.id, kind: 'asap', open: true }, { $set: { status: 'cancelled', open: false, cancelled_at: new Date() } }, { returnDocument: 'after' });
    if (!b) {
      if (await this.col().findOne({ id, patient_id: user.id, kind: 'asap' }, { projection: { id: 1 } })) throw new ConflictException('asap_not_open');
      throw new NotFoundException('asap_not_found');
    }
    return this.shape(b as unknown as Broadcast, false);
  }

  /** Providers of the broadcast's kind that offer `home` for every item, within the radius of the stage and of their own. */
  private async reach(b: Broadcast, radius: number, policy: { keys: string[]; cls: string } | null): Promise<Array<Reached & { snap_ok: true }>> {
    const found = await this.ordering.findCandidates(b.service_kind, 'home', b.kind === 'asap' ? b.items : null, { lat: b.lat, lng: b.lng, payer: b.payer }, policy, new Date());
    return found.cands
      .filter((c) => c.distance_km <= radius)
      .filter((c) => b.kind === 'photo' || b.items.every((id) => c.prices[id] != null))
      .filter((c) => !policy || c.in_network)
      .map((c) => ({ account_id: found.snapshot[c.provider_id].account_id, public_id: c.provider_id, distance_km: round1(c.distance_km), auto_accept: found.snapshot[c.provider_id].auto_accept, snap_ok: true as const }));
  }

  /** Reaches the providers newly inside the current stage; an auto-accept provider takes it at once, nearest first. */
  private async enterStage(b: Broadcast, policy?: { keys: string[]; cls: string } | null): Promise<Broadcast> {
    const pol = policy === undefined ? await this.ordering.policyOf(b.patient_id, b.payer).catch(() => null) : policy;
    const radius = b.stages[b.stage - 1].radius_km;
    const known = new Set(b.reached.map((r) => r.account_id));
    const fresh = (await this.reach(b, radius, pol)).filter((r) => !known.has(r.account_id)).sort((x, y) => x.distance_km - y.distance_km);
    if (fresh.length) {
      const rows: Reached[] = fresh.map(({ account_id, public_id, distance_km, auto_accept }) => ({ account_id, public_id, distance_km, auto_accept }));
      await this.col().updateOne({ id: b.id, open: true }, { $push: { reached: { $each: rows } } } as never);
    }
    let cur = (await this.col().findOne({ id: b.id })) as unknown as Broadcast;
    if (cur.kind === 'asap' && cur.open) {
      for (const r of fresh.filter((x) => x.auto_accept)) {
        try {
          const won = await this.accept(cur.id, r.account_id, r.public_id);
          if (won) break;
        } catch (e) {
          this.logger.warn(`auto-accept of ${cur.id} failed: ${(e as Error).message}`);
        }
      }
      cur = (await this.col().findOne({ id: b.id })) as unknown as Broadcast;
    }
    return cur;
  }

  /** Moves a broadcast through the stages whose time has passed (compare-and-set on the stage number). */
  async advance(b: Broadcast): Promise<Broadcast> {
    let cur = b;
    for (let guard = 0; guard < MAX_STAGES + 2; guard++) {
      const now = new Date();
      if (!cur.open) return cur;
      if (cur.kind === 'photo') {
        if (cur.expires_at && now >= new Date(cur.expires_at)) {
          const x = await this.col().findOneAndUpdate({ id: cur.id, open: true }, { $set: { status: 'expired', open: false } }, { returnDocument: 'after' });
          return (x as unknown as Broadcast) ?? ((await this.col().findOne({ id: cur.id })) as unknown as Broadcast);
        }
        return cur;
      }
      if (now < new Date(cur.stage_ends_at)) return cur;
      const next = cur.stage + 1;
      if (next > cur.stages.length) {
        const fallback = { earliest_window: await this.earliestWindow(cur) };
        const x = await this.col().findOneAndUpdate({ id: cur.id, open: true, stage: cur.stage }, { $set: { status: 'expired', open: false, fallback } }, { returnDocument: 'after' });
        return (x as unknown as Broadcast) ?? ((await this.col().findOne({ id: cur.id })) as unknown as Broadcast);
      }
      const from = new Date(cur.stage_ends_at);
      const moved = await this.col().findOneAndUpdate(
        { id: cur.id, open: true, stage: cur.stage },
        { $set: { stage: next, stage_started_at: from, stage_ends_at: new Date(from.getTime() + cur.stages[next - 1].timeout_seconds * 1000) } },
        { returnDocument: 'after' },
      );
      if (!moved) { cur = (await this.col().findOne({ id: cur.id })) as unknown as Broadcast; continue; } // another process moved it
      cur = await this.enterStage(moved as unknown as Broadcast);
    }
    return cur;
  }

  async advanceDue() {
    const due = await this.col().find({ open: true, kind: 'asap', stage_ends_at: { $lte: new Date() } }).limit(50).toArray();
    for (const b of due) await this.advance(b as unknown as Broadcast).catch((e) => this.logger.warn(`advance ${b.id}: ${(e as Error).message}`));
  }

  /** After the last stage: the earliest timed window of the nearest provider that could do every item at home. */
  private async earliestWindow(b: Broadcast) {
    const found = await this.ordering.findCandidates(b.service_kind, 'home', b.items, { lat: b.lat, lng: b.lng, payer: b.payer }, await this.ordering.policyOf(b.patient_id, b.payer).catch(() => null), new Date());
    const full = found.cands.filter((c) => b.items.every((id) => c.prices[id] != null)).sort((x, y) => x.distance_km - y.distance_km);
    const w = homeWindows(new Date(), 3)[0];
    return full.length && w ? { provider_id: full[0].provider_id, start: w.start, end: w.end } : null;
  }

  // ---------- acceptance (provider or auto) ----------

  /** The first call wins: the broadcast flips from open to accepted exactly once, then the booking is made. Returns the booking id, or null when taken. */
  private async accept(id: string, accountId: string, publicId: string): Promise<string | null> {
    const won = await this.col().findOneAndUpdate(
      { id, kind: 'asap', open: true, 'reached.account_id': accountId },
      { $set: { status: 'accepted', open: false, accepted_by: publicId, accepted_account_id: accountId, accepted_at: new Date() } },
      { returnDocument: 'after' },
    );
    if (!won) return null;
    try {
      const b = won as unknown as Broadcast;
      const booking = await this.bookAsap(b, accountId);
      await this.col().updateOne({ id }, { $set: { booking_id: booking } });
      await recordAudit(this.conn, { action: 'ordering.asap_accepted', user_id: accountId, role: 'provider', resource_kind: 'ordering_broadcast', resource_id: id, details: { booking_id: booking } });
      return booking;
    } catch (e) {
      // no booking, no acceptance: the broadcast opens again for the others
      await this.col().updateOne({ id, status: 'accepted', booking_id: { $exists: false } }, { $set: { status: 'broadcasting', open: true }, $unset: { accepted_by: '', accepted_account_id: '', accepted_at: '' } }).catch(() => null);
      throw e;
    }
  }

  async providerAccept(provider: { id: string }, id: string) {
    const b = (await this.col().findOne({ id, 'reached.account_id': provider.id })) as unknown as Broadcast | null;
    if (!b) throw new NotFoundException('broadcast_not_found');
    if (b.kind !== 'asap') throw bad('use_offer');
    const advanced = await this.advance(b);
    const mine = advanced.reached.find((r) => r.account_id === provider.id);
    const booking = mine ? await this.accept(id, provider.id, mine.public_id) : null;
    if (!booking) throw new ConflictException('broadcast_already_taken');
    return { booking_id: booking };
  }

  async providerList(provider: { id: string }) {
    await this.advanceDue().catch(() => null);
    const rows = (await this.col().find({ open: true, 'reached.account_id': provider.id }).sort({ created_at: -1 }).limit(100).toArray()) as unknown as Broadcast[];
    const now = Date.now();
    return {
      broadcasts: rows.map((b) => ({
        id: b.id, kind: b.kind, service_kind: b.service_kind, status: b.status, items: b.items, items_unconfirmed: b.kind === 'photo',
        stage: b.stage, distance_km: b.reached.find((r) => r.account_id === provider.id)?.distance_km ?? null,
        seconds_left: b.kind === 'asap' ? Math.max(0, Math.ceil((new Date(b.stage_ends_at).getTime() - now) / 1000)) : null,
        payer: b.payer, upload_id: b.upload_id ?? null, created_at: b.created_at,
      })),
    };
  }

  // ---------- booking from a broadcast ----------

  private async patientOf(id: string) {
    const u: any = await this.conn.collection('users').findOne({ id }, { projection: { id: 1, full_name: 1, phone: 1, role: 1 } });
    if (!u) throw new NotFoundException('patient_not_found');
    return { id: u.id, full_name: u.full_name, phone: u.phone, role: 'patient' };
  }

  private async bookAsap(b: Broadcast, accountId: string): Promise<string> {
    const [settings, rows, names] = await Promise.all([
      this.conn.collection(SETTINGS).findOne({ provider_account_id: accountId }) as Promise<any>,
      this.conn.collection(ITEMS).find({ provider_account_id: accountId, service_kind: b.service_kind, catalog_id: { $in: b.items }, available: { $ne: false } }).toArray() as Promise<any[]>,
      this.conn.collection(KIND_CATALOG[b.service_kind]).find({ id: { $in: b.items } }).toArray() as Promise<any[]>,
    ]);
    const priceOf = new Map(rows.filter((r) => typeof r.prices?.home === 'number').map((r) => [r.catalog_id as string, r.prices.home as number]));
    if (b.items.some((id) => !priceOf.has(id))) throw bad('provider_not_candidate');
    const nameOf = new Map(names.map((n: any) => [n.id as string, n]));
    const booking: any = await this.labs.createPriced(await this.patientOf(b.patient_id), {
      provider_account_id: accountId, mode: 'home',
      items: b.items.map((id) => ({ service_id: id, name_ar: nameOf.get(id)?.name_ar, name_en: nameOf.get(id)?.name_en, price: priceOf.get(id) as number })),
      home_fee: typeof settings?.home_fee === 'number' ? settings.home_fee : 0, scheduled_at: new Date(), asap: true,
      payment_method: b.payer === 'insurance' ? 'insurance' : 'card', awaiting_approval: b.payer === 'insurance',
      address: { lat: b.lat, lng: b.lng }, order_group_id: b.id, quote_id: b.id,
    });
    return booking.id;
  }

  // ---------- photo order ----------

  async startPhoto(user: { id: string }, dto: PhotoOrderDto) {
    if (!dto.upload_id) throw bad('photo_upload_required');
    const own = await this.conn.collection('storage_objects').findOne({ id: dto.upload_id, owner_account_id: user.id }, { projection: { id: 1 } })
      ?? await this.conn.collection('uploads').findOne({ id: dto.upload_id, owner_id: user.id }, { projection: { id: 1 } });
    if (!own) throw new NotFoundException('upload_not_found');
    const policy = await this.ordering.policyOf(user.id, dto.payer);
    const stages = await this.stagesConfig();
    const now = new Date();
    const doc: Broadcast & { purge_at: Date } = {
      id: `pb_${randomUUID()}`, kind: 'photo', patient_id: user.id, service_kind: dto.service_kind, items: [], lat: dto.lat, lng: dto.lng, payer: dto.payer,
      status: 'awaiting_offers', open: true, stage: 1, stages: [stages[0]], stage_started_at: now, stage_ends_at: new Date(now.getTime() + PHOTO_OPEN_MS),
      reached: [], upload_id: dto.upload_id, created_at: now, expires_at: new Date(now.getTime() + PHOTO_OPEN_MS), purge_at: new Date(now.getTime() + PURGE_MS),
    };
    await this.insertOpen(doc, 'photo_order_open');
    const after = await this.enterStage(doc, policy);
    return { id: after.id, status: after.status, items_unconfirmed: true, providers_notified: after.reached.length, expires_at: after.expires_at };
  }

  async providerOffer(provider: { id: string }, id: string, dto: BroadcastOfferDto) {
    const b = (await this.col().findOne({ id, kind: 'photo', 'reached.account_id': provider.id })) as unknown as Broadcast | null;
    if (!b) throw new NotFoundException('broadcast_not_found');
    const cur = await this.advance(b);
    if (!cur.open || cur.status !== 'awaiting_offers') throw new ConflictException('offers_closed');
    const items = dto.items.map((i) => ({ name: i.name.trim(), price: round2(i.price) }));
    if (items.some((i) => !i.name)) throw bad('offer_item_name_required');
    const total = round2(items.reduce((s, i) => s + i.price, 0));
    const now = new Date();
    await this.offers().updateOne(
      { broadcast_id: id, provider_account_id: provider.id },
      { $set: { items, total, note: dto.note ?? null, updated_at: now }, $setOnInsert: { id: `of_${randomUUID()}`, created_at: now, purge_at: new Date(now.getTime() + PURGE_MS) } },
      { upsert: true },
    );
    // an offer that lost the race with the patient's acceptance is withdrawn, not left dangling
    if (!(await this.col().findOne({ id, open: true, status: 'awaiting_offers' }, { projection: { id: 1 } }))) {
      await this.offers().deleteOne({ broadcast_id: id, provider_account_id: provider.id });
      throw new ConflictException('offers_closed');
    }
    return { total, items };
  }

  async listOffers(user: { id: string }, id: string) {
    const b = (await this.col().findOne({ id, patient_id: user.id, kind: 'photo' })) as unknown as Broadcast | null;
    if (!b) throw new NotFoundException('photo_order_not_found');
    const offers = (await this.offers().find({ broadcast_id: id }).sort({ total: 1, created_at: 1 }).toArray()) as any[];
    const profiles = (await this.conn.collection('provider_profiles').find({ account_id: { $in: offers.map((o) => o.provider_account_id) } }, { projection: { id: 1, account_id: 1, name_ar: 1, name_en: 1, rating: 1 } }).toArray()) as any[];
    const byAccount = new Map(profiles.map((p) => [p.account_id as string, p]));
    return {
      status: b.status,
      offers: offers.map((o) => {
        const p = byAccount.get(o.provider_account_id);
        return {
          id: o.id, provider_id: p?.id ?? null, name_ar: p?.name_ar ?? null, name_en: p?.name_en ?? null, rating: typeof p?.rating === 'number' ? p.rating : null,
          distance_km: b.reached.find((r) => r.account_id === o.provider_account_id)?.distance_km ?? null,
          total: o.total, items: o.items, note: o.note ?? null, created_at: o.created_at,
        };
      }),
    };
  }

  async acceptOffer(user: { id: string }, id: string, offerId: string) {
    const offer: any = await this.offers().findOne({ id: offerId, broadcast_id: id });
    const owns = await this.col().findOne({ id, patient_id: user.id, kind: 'photo' }, { projection: { id: 1 } });
    if (!offer || !owns) throw new NotFoundException('offer_not_found');
    const won = await this.col().findOneAndUpdate(
      { id, patient_id: user.id, kind: 'photo', open: true, status: 'awaiting_offers' },
      { $set: { status: 'accepted', open: false, accepted_offer_id: offerId, accepted_account_id: offer.provider_account_id, accepted_at: new Date() } },
      { returnDocument: 'after' },
    );
    if (!won) throw new ConflictException('offer_already_accepted');
    try {
      const b = won as unknown as Broadcast;
      const patient = await this.patientOf(user.id);
      const booking: any = await this.labs.createPriced(patient, {
        provider_account_id: offer.provider_account_id, mode: 'home',
        // the offer total is all-inclusive: the provider confirmed these items and priced them knowing the visit
        items: offer.items.map((i: { name: string; price: number }, n: number) => ({ service_id: `offer:${offerId}:${n}`, name_ar: i.name, name_en: i.name, price: i.price })),
        home_fee: 0, scheduled_at: new Date(), asap: true,
        payment_method: b.payer === 'insurance' ? 'insurance' : 'card', awaiting_approval: b.payer === 'insurance',
        address: { lat: b.lat, lng: b.lng }, order_group_id: b.id, quote_id: b.id,
      });
      await this.col().updateOne({ id }, { $set: { booking_id: booking.id } });
      await recordAudit(this.conn, { action: 'ordering.photo_offer_accepted', user_id: user.id, role: 'patient', resource_kind: 'ordering_broadcast', resource_id: id, details: { booking_id: booking.id, total: offer.total } });
      return { booking_id: booking.id };
    } catch (e) {
      await this.col().updateOne({ id, status: 'accepted', booking_id: { $exists: false } }, { $set: { status: 'awaiting_offers', open: true }, $unset: { accepted_offer_id: '', accepted_account_id: '', accepted_at: '' } }).catch(() => null);
      throw e;
    }
  }

  // ---------- shared ----------

  private async insertOpen(doc: object, conflictCode: string) {
    try {
      await this.col().insertOne(doc as never);
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw new ConflictException(conflictCode);
      throw e;
    }
  }

  private async assertHomeItems(kind: Kind, ids: string[]) {
    const rows = await this.conn.collection(KIND_CATALOG[kind]).find({ id: { $in: ids } }).toArray() as any[];
    if (rows.length !== ids.length) throw bad('unknown_catalog_item');
    if (rows.some((c) => (kind === 'radiology' ? c.portable_ultrasound !== true : c.home_visit_supported === false))) throw bad('asap_home_not_available');
  }

  private shape(b: Broadcast, created: boolean) {
    const stage = b.stages[Math.min(b.stage, b.stages.length) - 1];
    return {
      id: b.id, status: b.status, stage: b.stage, radius_km: stage.radius_km,
      ...(created ? { stage_ends_at: new Date(b.stage_ends_at).toISOString(), providers_notified: b.reached.length } : {}),
      seconds_left: b.open ? Math.max(0, Math.ceil((new Date(b.stage_ends_at).getTime() - Date.now()) / 1000)) : 0,
      ...(b.accepted_by ? { accepted_by: b.accepted_by } : {}),
      ...(b.booking_id ? { booking_id: b.booking_id } : {}),
      ...(b.fallback ? { fallback: b.fallback } : {}),
    };
  }
}
