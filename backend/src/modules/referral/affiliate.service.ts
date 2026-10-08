import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createHash, randomBytes } from 'crypto';

export interface AffiliateLink {
  code: string;
  partner_id: string;
  name: string;
  commission_bps: number;
  max_uses: number | null;
  uses: number;
  active: boolean;
}

function phoneHash(phone: string | undefined): string | null {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return createHash('sha256').update(`aff:${digits}`).digest('hex');
}

/**
 * P22.15 — affiliate link issuance, click attribution, and redemption with
 * hard anti-fraud: one device and one phone per referred user ACROSS the
 * program. Fraud SCORING (velocity, farms, 3DS) lives in finance-engine
 * FraudService / the fraud agent — this service only enforces the uniqueness
 * invariant and records the evidence they score on.
 */
@Injectable()
export class AffiliateService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async issue(
    partnerId: string,
    opts: { name: string; commission_bps: number; max_uses?: number },
  ): Promise<AffiliateLink> {
    const bps = Math.floor(Number(opts.commission_bps));
    if (!opts.name || !(bps >= 0 && bps <= 5000))
      throw new BadRequestException('invalid_affiliate_terms');
    if (opts.max_uses !== undefined && !(Math.floor(Number(opts.max_uses)) > 0))
      throw new BadRequestException('invalid_max_uses');
    for (let i = 0; i < 10; i++) {
      const code = `AFF-${randomBytes(4).toString('hex').toUpperCase()}`;
      const clash = await this.conn.collection('affiliate_links').findOne({
        code: { $eq: code },
      } as never);
      if (!clash) {
        const doc: AffiliateLink = {
          code,
          partner_id: String(partnerId),
          name: String(opts.name),
          commission_bps: bps,
          max_uses:
            opts.max_uses !== undefined ? Math.floor(Number(opts.max_uses)) : null,
          uses: 0,
          active: true,
        };
        await this.conn.collection('affiliate_links').insertOne({
          ...doc,
          createdAt: new Date(),
        } as never);
        return doc;
      }
    }
    throw new ConflictException('code_collision: retry issuance');
  }

  /** Attribution ping when a prospect opens an affiliate link. */
  async click(
    code: string,
    signal: { device_id?: string; phone?: string },
  ): Promise<{ ok: boolean; code: string }> {
    const link = await this.link(String(code));
    await this.conn.collection('affiliate_attributions').insertOne({
      id: `att_${randomBytes(8).toString('hex')}`,
      code: link.code,
      partner_id: link.partner_id,
      device_id: signal.device_id ? String(signal.device_id) : null,
      phone_hash: phoneHash(signal.phone),
      clicked_at: new Date(),
    } as never);
    return { ok: true, code: link.code };
  }

  /**
   * Redeem an affiliate code for a user (post-signup, pre-first-order).
   * Guards: link active, max uses (atomic), one redemption per user,
   * one device per user, one phone per user across the program.
   */
  async redeem(
    code: string,
    userId: string,
    signal: { device_id?: string; phone?: string; order_id?: string },
  ): Promise<{ ok: boolean; code: string; commission_bps: number }> {
    const link = await this.link(String(code));
    const uid = String(userId);
    const device = signal.device_id ? String(signal.device_id) : null;
    const ph = phoneHash(signal.phone);

    const mine = await this.conn.collection('affiliate_redemptions').findOne({
      code: { $eq: link.code },
      user_id: { $eq: uid },
    } as never);
    if (mine) throw new ConflictException('already_redeemed');

    if (device) {
      const reuse = await this.conn.collection('affiliate_redemptions').findOne({
        device_id: { $eq: device },
        user_id: { $ne: uid },
      } as never);
      if (reuse) throw new ConflictException('referral_device_reuse');
    }
    if (ph) {
      const reuse = await this.conn.collection('affiliate_redemptions').findOne({
        phone_hash: { $eq: ph },
        user_id: { $ne: uid },
      } as never);
      if (reuse) throw new ConflictException('referral_phone_reuse');
    }

    if (link.max_uses !== null) {
      const bumped = (await this.conn.collection('affiliate_links').updateOne(
        { code: { $eq: link.code }, uses: { $lt: link.max_uses } } as never,
        { $inc: { uses: 1 } } as never,
      )) as unknown as { matchedCount?: number };
      if (!bumped.matchedCount) throw new ConflictException('affiliate_cap_reached');
    } else {
      await this.conn.collection('affiliate_links').updateOne(
        { code: { $eq: link.code } } as never,
        { $inc: { uses: 1 } } as never,
      );
    }

    try {
      await this.conn.collection('affiliate_redemptions').insertOne({
        id: `red_${randomBytes(8).toString('hex')}`,
        code: link.code,
        partner_id: link.partner_id,
        user_id: uid,
        device_id: device,
        phone_hash: ph,
        order_id: signal.order_id ? String(signal.order_id) : null,
        commission_bps: link.commission_bps,
        createdAt: new Date(),
      } as never);
    } catch (e) {
      await this.conn.collection('affiliate_links').updateOne(
        { code: { $eq: link.code } } as never,
        { $inc: { uses: -1 } } as never,
      );
      throw e;
    }
    return { ok: true, code: link.code, commission_bps: link.commission_bps };
  }

  private async link(code: string): Promise<AffiliateLink> {
    const doc = await this.conn.collection('affiliate_links').findOne({
      code: { $eq: String(code).toUpperCase() },
    } as never);
    if (!doc) throw new NotFoundException('invalid_affiliate_code');
    const link = doc as unknown as AffiliateLink;
    if (!link.active) throw new BadRequestException('affiliate_inactive');
    return link;
  }
}
