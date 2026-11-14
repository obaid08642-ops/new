/**
 * Owner decision 2026-10-25 (supersedes OD-12): a line above the catalogue price makes a PriceReview; at or below makes none; the admin
 * decides each once (update the catalogue, dismiss, or act on the pharmacy), with who, when and why. Real MongoDB (in memory).
 */
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { PRICE_REVIEWS, percentAbove, syncLineReviews } from '../price-review';
import { PharmacyPriceReviewService } from '../price-review.service';
import { PriceReviewNoteDto, PriceReviewPenaltyDto, PriceReviewSuspendDto } from '../price-review.dto';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;
let conn: Connection;
const admin = { id: 'admin-1', role: 'admin' };
const providerAdmin = { suspend: jest.fn(), reactivate: jest.fn() };
const providerNotifications = { createSystem: jest.fn() };
let service: PharmacyPriceReviewService;

const line = (over: Record<string, unknown> = {}) => ({ order_item_id: 'i1', medicine_id: 'med-1', sku: 'S1', name_ar: 'دواء', name_en: 'Drug', unit_price: 12, catalogue_price: 10, above_catalogue_price: true, price_check: 'verified', ...over });
const offer = (items: any[], over: Record<string, unknown> = {}) => ({ id: 'of1', pharmacy_account_id: 'ph1', status: 'draft', items, ...over });
const col = () => conn.collection(PRICE_REVIEWS);
const notices = () => conn.collection('notifications').find({ type: 'pharmacy_price_above_catalogue' }).toArray();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  conn = await mongoose.createConnection(mongod.getUri()).asPromise();
  service = new PharmacyPriceReviewService(conn, providerAdmin as any, providerNotifications as any);
});
afterAll(async () => { await conn?.close(); await mongod?.stop(); });
beforeEach(async () => {
  await col().deleteMany({});
  await conn.collection('notifications').deleteMany({});
  await conn.collection('platformledgerentries').deleteMany({});
  await conn.collection('medicines').deleteMany({});
  await conn.collection('medicines').insertOne({ id: 'med-1', sfda_price: 10, name_en: 'Drug' });
  providerAdmin.suspend.mockReset().mockResolvedValue({});
  providerAdmin.reactivate.mockReset().mockResolvedValue({});
  await conn.collection('provider_accounts').deleteMany({});
  await conn.collection('provider_profiles').deleteMany({});
  providerNotifications.createSystem.mockReset().mockResolvedValue({});
});

describe('a review is created for a line above the catalogue price, and only then', () => {
  it('above: one row with the pharmacy, order, offer, medicine, both prices, % above, open', async () => {
    await syncLineReviews(conn, offer([line()]), 'o1', new Date('2026-10-25T08:00:00Z'));
    const rows: any[] = await col().find({}).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ pharmacy_id: 'ph1', order_id: 'o1', offer_id: 'of1', medicine_id: 'med-1', catalogue_price: 10, offered_price: 12, percent_above: 20, status: 'open', admin_id: null, action: null, note: null });
    expect(rows[0].id).toBeTruthy();
    expect(rows[0].created_at).toBeInstanceOf(Date);
  });
  it('at or below the catalogue price: none (the offer service does not flag it)', async () => {
    await syncLineReviews(conn, offer([line({ unit_price: 10, above_catalogue_price: undefined }), line({ order_item_id: 'i2', unit_price: 8, above_catalogue_price: undefined })]), 'o1');
    expect(await col().countDocuments({})).toBe(0);
    expect(await notices()).toHaveLength(0);
  });
  it('a flagged line whose prices do not really exceed is ignored', async () => {
    await syncLineReviews(conn, offer([line({ unit_price: 10 })]), 'o1');
    expect(await col().countDocuments({})).toBe(0);
  });
  it('a draft that changes keeps one row per line, updates its price, and removes the row when the line drops to the catalogue price', async () => {
    await syncLineReviews(conn, offer([line()]), 'o1');
    await syncLineReviews(conn, offer([line({ unit_price: 15 })]), 'o1');
    const rows: any[] = await col().find({}).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ offered_price: 15, percent_above: 50 });
    await syncLineReviews(conn, offer([line({ unit_price: 10, above_catalogue_price: undefined })]), 'o1');
    expect(await col().countDocuments({})).toBe(0);
  });
  it('a decided review is never reopened or rewritten by a later sync of the same offer', async () => {
    await syncLineReviews(conn, offer([line()]), 'o1');
    const { id } = (await col().findOne({})) as any;
    await service.dismiss(admin, id, 'price is justified');
    await syncLineReviews(conn, offer([line({ unit_price: 30 })]), 'o1');
    expect(await col().findOne({ id })).toMatchObject({ status: 'dismissed', offered_price: 12 });
    expect(await col().countDocuments({})).toBe(1);
  });
  it('percentAbove rounds to two decimals', () => {
    expect(percentAbove(12.34, 10)).toBe(23.4);
    expect(percentAbove(10.01, 10)).toBe(0.1);
  });
});

describe('admin notice: one per pharmacy + medicine per day', () => {
  it('two offers of the same pharmacy for the same medicine on one day make one notice; another medicine or pharmacy or day makes another', async () => {
    const day = new Date('2026-10-25T08:00:00Z');
    await syncLineReviews(conn, offer([line()]), 'o1', day);
    await syncLineReviews(conn, offer([line()], { id: 'of2' }), 'o2', day);
    expect(await notices()).toHaveLength(1);
    expect(await col().countDocuments({})).toBe(2); // the rows are not de-duplicated, only the notice
    await syncLineReviews(conn, offer([line({ medicine_id: 'med-2', order_item_id: 'i9' })], { id: 'of3' }), 'o3', day);
    await syncLineReviews(conn, offer([line()], { id: 'of4', pharmacy_account_id: 'ph2' }), 'o4', day);
    await syncLineReviews(conn, offer([line()], { id: 'of5' }), 'o5', new Date('2026-10-26T08:00:00Z'));
    expect(await notices()).toHaveLength(4);
    expect((await notices())[0]).toMatchObject({ role: 'admin', body: { pharmacy_id: 'ph1', medicine_id: 'med-1', percent_above: 20 } });
  });
});

describe('what the admin can do (once, with a reason)', () => {
  const open = async () => { await syncLineReviews(conn, offer([line()]), 'o1'); return (await col().findOne({})) as any; };

  it('update the catalogue price: the medicine takes the offered price, the review records who/when/why', async () => {
    const r = await open();
    const out = await service.updateCatalogue(admin, r.id, 'new official price');
    expect(out).toMatchObject({ status: 'catalogue_updated', action: 'catalogue_updated', admin_id: 'admin-1', note: 'new official price' });
    expect(out.acted_at).toBeTruthy();
    expect(await conn.collection('medicines').findOne({ id: 'med-1' })).toMatchObject({ sfda_price: 12 });
  });
  it('dismiss: the catalogue is untouched', async () => {
    const r = await open();
    await service.dismiss(admin, r.id, 'justified');
    expect(await col().findOne({ id: r.id })).toMatchObject({ status: 'dismissed', action: 'dismissed', note: 'justified' });
    expect(await conn.collection('medicines').findOne({ id: 'med-1' })).toMatchObject({ sfda_price: 10 });
  });
  it('warning: a notice to the pharmacy and the review is actioned', async () => {
    const r = await open();
    await service.warn(admin, r.id, 'stay near the official price');
    expect(providerNotifications.createSystem).toHaveBeenCalledWith('ph1', expect.objectContaining({ related_id: r.id, related_type: 'pharmacy_price_review' }));
    expect(await col().findOne({ id: r.id })).toMatchObject({ status: 'pharmacy_actioned', action: 'warning' });
  });
  it('temporary suspension: uses the provider suspension, records the end date; a past date is refused and nothing changes', async () => {
    const r = await open();
    await expect(service.suspend(admin, r.id, 'repeat offence', '2020-01-01T00:00:00Z')).rejects.toThrow('suspension_end_must_be_in_the_future');
    expect(await col().findOne({ id: r.id })).toMatchObject({ status: 'open' });
    await service.suspend(admin, r.id, 'repeat offence', '2999-01-01T00:00:00Z');
    expect(providerAdmin.suspend).toHaveBeenCalledWith(admin, 'ph1', expect.objectContaining({ reason: expect.stringContaining(r.id) }));
    expect(await col().findOne({ id: r.id })).toMatchObject({ status: 'pharmacy_actioned', action: 'suspend_temporary' });
  });
  it('block: suspends the account and flags the profile', async () => {
    await conn.collection('provider_profiles').insertOne({ account_id: 'ph1', type: 'pharmacy' });
    const r = await open();
    await service.block(admin, r.id, 'gouging');
    expect(providerAdmin.suspend).toHaveBeenCalledWith(admin, 'ph1', expect.anything());
    expect(await conn.collection('provider_profiles').findOne({ account_id: 'ph1' })).toMatchObject({ blocked_by_price_review: r.id });
    expect(await col().findOne({ id: r.id })).toMatchObject({ status: 'pharmacy_actioned', action: 'block' });
  });
  it('penalty: one provider debit in the ledger for that review, never twice', async () => {
    const r = await open();
    await service.penalty(admin, r.id, 'fine', 250);
    const debits = await conn.collection('platformledgerentries').find({ type: 'provider_debit', ref_type: 'price_review', ref_id: r.id }).toArray();
    expect(debits).toHaveLength(1);
    expect(debits[0]).toMatchObject({ provider_account_id: 'ph1', amount: 250 });
    await expect(service.penalty(admin, r.id, 'fine again', 250)).rejects.toBeInstanceOf(ConflictException);
    expect(await conn.collection('platformledgerentries').countDocuments({ ref_id: r.id })).toBe(1);
  });
  it('a decided review cannot be decided again (409) and an unknown one is 404', async () => {
    const r = await open();
    await service.dismiss(admin, r.id, 'justified');
    await expect(service.updateCatalogue(admin, r.id, 'again')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.warn(admin, 'nope', 'x y z')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('a failing pharmacy action gives the review back to the queue', async () => {
    const r = await open();
    providerAdmin.suspend.mockRejectedValueOnce(new Error('boom'));
    await expect(service.block(admin, r.id, 'gouging')).rejects.toThrow('boom');
    expect(await col().findOne({ id: r.id })).toMatchObject({ status: 'open', action: null, admin_id: null });
  });
  it('lists by status, pharmacy and minimum % above, newest first, with the detail history for the same pharmacy and medicine', async () => {
    await syncLineReviews(conn, offer([line()]), 'o1');
    await syncLineReviews(conn, offer([line({ unit_price: 20 })], { id: 'of2' }), 'o2');
    expect((await service.list({})).total).toBe(2);
    expect((await service.list({ min_percent: '50' })).items.map((x: any) => x.percent_above)).toEqual([100]);
    expect((await service.list({ pharmacy_id: 'other' })).total).toBe(0);
    const first = (await service.list({})).items[0] as any;
    expect((await service.get(first.id)).history).toHaveLength(1);
  });
});

describe('the decisions need a reason', () => {
  it('a missing or too short note is refused by the DTOs; a penalty needs a positive amount; a suspension an end date', async () => {
    expect(await validate(plainToInstance(PriceReviewNoteDto, {}))).not.toHaveLength(0);
    expect(await validate(plainToInstance(PriceReviewNoteDto, { note: 'ab' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(PriceReviewNoteDto, { note: 'justified' }))).toHaveLength(0);
    expect(await validate(plainToInstance(PriceReviewPenaltyDto, { note: 'fine', amount_sar: 0 }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(PriceReviewPenaltyDto, { note: 'fine', amount_sar: 100 }))).toHaveLength(0);
    expect(await validate(plainToInstance(PriceReviewSuspendDto, { note: 'fine' }))).not.toHaveLength(0);
  });
});

describe('a temporary suspension ends by itself', () => {
  const ended = new Date('2026-11-01T00:00:00Z');
  const after = new Date('2026-11-01T00:10:00Z');
  const suspended = (over: Record<string, unknown> = {}) => col().insertOne({ id: 'r1', status: 'pharmacy_actioned', action: 'suspend_temporary', pharmacy_id: 'ph1', suspended_until: ended, note: 'repeat', name_ar: 'دواء', ...over });
  const account = (status = 'suspended') => conn.collection('provider_accounts').insertOne({ id: 'ph1', status });

  it('reactivates the pharmacy at the end date, tells it, audits it, and does it once', async () => {
    await account(); await suspended();
    expect(await service.liftExpiredSuspensions(after)).toEqual({ lifted: 1, skipped: 0, failed: 0 });
    expect(providerAdmin.reactivate).toHaveBeenCalledWith({ id: 'system', role: 'admin' }, 'ph1', expect.objectContaining({ reason: expect.stringContaining('r1') }));
    expect(providerNotifications.createSystem).toHaveBeenCalledWith('ph1', expect.objectContaining({ related_id: 'r1' }));
    expect(await col().findOne({ id: 'r1' })).toMatchObject({ lifted_state: 'lifted' });
    expect(await conn.collection('auditlogs').countDocuments({ action: 'pharmacy.price_review.suspension_lifted' })).toBe(1);
    expect(await service.liftExpiredSuspensions(after)).toEqual({ lifted: 0, skipped: 0, failed: 0 });
    expect(providerAdmin.reactivate).toHaveBeenCalledTimes(1);
  });

  it('does nothing before the end date', async () => {
    await account(); await suspended();
    expect(await service.liftExpiredSuspensions(new Date('2026-10-31T23:00:00Z'))).toEqual({ lifted: 0, skipped: 0, failed: 0 });
    expect(providerAdmin.reactivate).not.toHaveBeenCalled();
  });

  it.each([
    ['not_suspended', async () => { await account('approved'); await suspended(); }],
    ['blocked_by_price_review', async () => { await account(); await conn.collection('provider_profiles').insertOne({ account_id: 'ph1', blocked_by_price_review: 'r9' }); await suspended(); }],
    ['later_suspension_running', async () => { await account(); await suspended(); await suspended({ id: 'r2', suspended_until: new Date('2027-01-01T00:00:00Z') }); }],
  ])('skips the lift (%s) and says why on the row', async (reason, setup) => {
    await setup();
    const res = await service.liftExpiredSuspensions(after);
    expect(res.lifted).toBe(0);
    expect(providerAdmin.reactivate).not.toHaveBeenCalled();
    expect(await col().findOne({ id: 'r1' })).toMatchObject({ lifted_state: `skipped:${reason}` });
  });

  it('gives the claim back when the reactivation fails, so the next run tries again', async () => {
    await account(); await suspended();
    providerAdmin.reactivate.mockRejectedValueOnce(new Error('scfhs_license_not_verified'));
    expect(await service.liftExpiredSuspensions(after)).toEqual({ lifted: 0, skipped: 0, failed: 1 });
    expect(await col().findOne({ id: 'r1' })).not.toHaveProperty('lifted_at');
    expect(await service.liftExpiredSuspensions(after)).toEqual({ lifted: 1, skipped: 0, failed: 0 });
  });
});
