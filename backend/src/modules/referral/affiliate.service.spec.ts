import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';

function memCollection(seed: Array<Record<string, unknown>> = []) {
  const docs: Array<Record<string, unknown>> = [...seed];
  const match = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean =>
    Object.entries(filter || {}).every(([k, cond]) => {
      const v = doc[k];
      if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
        const c = cond as Record<string, unknown>;
        if ('$eq' in c) return v === c['$eq'];
        if ('$ne' in c) return v !== c['$ne'];
        if ('$lt' in c) return Number(v) < Number(c['$lt']);
        return false;
      }
      return v === cond;
    });
  return {
    docs,
    findOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => {
      const hit = docs.find((d) => match(d, filter));
      return hit ? { ...hit } : null;
    }),
    insertOne: jest.fn().mockImplementation(async (doc: Record<string, unknown>) => {
      if (doc['code'] && doc['user_id'] && docs.some((d) => d['code'] === doc['code'] && d['user_id'] === doc['user_id'])) {
        const err = new Error('duplicate key');
        (err as { code?: number }).code = 11000;
        throw err;
      }
      docs.push({ ...doc });
      return { acknowledged: true };
    }),
    updateOne: jest.fn().mockImplementation(async (filter: Record<string, unknown>, upd: { $inc?: Record<string, number> }) => {
      const hit = docs.find((d) => match(d, filter));
      if (!hit) return { matchedCount: 0 };
      for (const [k, delta] of Object.entries(upd.$inc || {}))
        hit[k] = Number(hit[k] ?? 0) + delta;
      return { matchedCount: 1 };
    }),
  };
}

describe('AffiliateService (P22.15 issuance / attribution / redemption)', () => {
  function setup() {
    const collections: Record<string, ReturnType<typeof memCollection>> = {
      affiliate_links: memCollection([]),
      affiliate_attributions: memCollection([]),
      affiliate_redemptions: memCollection([]),
    };
    const conn = { collection: jest.fn((n: string) => collections[n]) };
    return { service: new AffiliateService(conn as never), collections };
  }

  it('issues unique codes and validates terms', async () => {
    const { service } = setup();
    const a = await service.issue('partner-1', { name: 'Clinic A', commission_bps: 500 });
    const b = await service.issue('partner-1', { name: 'Clinic B', commission_bps: 250 });
    expect(a.code).toMatch(/^AFF-/);
    expect(a.code).not.toBe(b.code);
    expect(a).toMatchObject({ partner_id: 'partner-1', commission_bps: 500, uses: 0, active: true });
    await expect(
      service.issue('partner-1', { name: 'X', commission_bps: 99999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records click attribution; unknown codes 404', async () => {
    const { service, collections } = setup();
    const link = await service.issue('partner-1', { name: 'A', commission_bps: 100 });
    await expect(service.click(link.code, { device_id: 'd-1' })).resolves.toMatchObject({
      ok: true,
      code: link.code,
    });
    expect(collections.affiliate_attributions.docs).toHaveLength(1);
    expect(collections.affiliate_attributions.docs[0]['device_id']).toBe('d-1');
    await expect(service.click('AFF-NOPE', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('redeems once per user and counts the use', async () => {
    const { service, collections } = setup();
    const link = await service.issue('partner-1', { name: 'A', commission_bps: 300 });
    const out = await service.redeem(link.code, 'user-1', { device_id: 'd-1', phone: '+966500000001' });
    expect(out).toMatchObject({ ok: true, commission_bps: 300 });
    // Raw phone is never stored — only the hash.
    const stored = collections.affiliate_redemptions.docs[0];
    expect(JSON.stringify(stored)).not.toMatch('966500000001');
    expect(stored['phone_hash']).toMatch(/^[a-f0-9]{64}$/);
    await expect(service.redeem(link.code, 'user-1', {})).rejects.toBeInstanceOf(ConflictException);
    expect(collections.affiliate_links.docs[0]['uses']).toBe(1);
  });

  it('rejects one device / one phone reused by another user (anti-fraud)', async () => {
    const { service } = setup();
    const link = await service.issue('partner-1', { name: 'A', commission_bps: 300 });
    await service.redeem(link.code, 'user-1', { device_id: 'd-shared', phone: '+966500000002' });
    await expect(
      service.redeem(link.code, 'user-2', { device_id: 'd-shared' }),
    ).rejects.toMatchObject({ response: { message: 'referral_device_reuse' } });
    await expect(
      service.redeem(link.code, 'user-3', { phone: '966 50 000 0002' }),
    ).rejects.toMatchObject({ response: { message: 'referral_phone_reuse' } });
    // Same device reused by the SAME user is fine (still one redemption).
    await expect(service.redeem(link.code, 'user-1', { device_id: 'd-shared' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('enforces the affiliate cap atomically and inactive links stay dead', async () => {
    const { service, collections } = setup();
    const link = await service.issue('partner-1', { name: 'A', commission_bps: 100, max_uses: 1 });
    await service.redeem(link.code, 'user-1', {});
    await expect(service.redeem(link.code, 'user-2', {})).rejects.toMatchObject({
      response: { message: 'affiliate_cap_reached' },
    });
    collections.affiliate_links.docs[0]['active'] = false;
    await expect(service.redeem(link.code, 'user-3', {})).rejects.toMatchObject({
      response: { message: 'affiliate_inactive' },
    });
  });
});
