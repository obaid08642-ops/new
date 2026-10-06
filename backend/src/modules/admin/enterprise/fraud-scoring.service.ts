import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  aggregateRisk,
  gateway3DSCapabilities,
  scoreAccountFarm,
  scoreCodAbuse,
  scoreFakeOrder,
  scorePaymentFraud,
  scorePromoAbuse,
  threeDSHook,
  Scored,
} from './fraud-scoring.math';

export interface UserRiskScores {
  userId: string;
  fakeOrder: Scored;
  codAbuse: Scored;
  accountFarm: Scored;
  promoAbuse: Scored;
  paymentFraud: Scored;
  combined: number;
  action: 'allow' | 'review' | 'block';
}

/**
 * P22.11 — fraud/risk scoring service (admin-owned).
 * Reads existing stores only (orders, users, coupon_*, moyasar_payments,
 * fraud_alerts); never modifies finance-engine or gateway code.
 */
@Injectable()
export class FraudScoringService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  private hoursAgo(h: number): Date {
    return new Date(Date.now() - h * 3600 * 1000);
  }

  async raiseAlert(input: {
    userId?: string;
    providerId?: string;
    flagType: string;
    confidence: number;
    details?: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<Record<string, unknown>> {
    const dup = await this.conn
      .collection('fraud_alerts')
      .findOne({ idempotencyKey: { $eq: String(input.idempotencyKey) } });
    if (dup) {
      const { _id, ...rest } = dup as unknown as Record<string, unknown>;
      void _id;
      return rest;
    }
    const doc = {
      id: this.newId('fa'),
      userId: input.userId || null,
      providerId: input.providerId || null,
      flagType: String(input.flagType),
      confidenceScore: Number(input.confidence),
      severity: Number(input.confidence) >= 0.8 ? 'high' : 'medium',
      details: input.details || {},
      status: 'pending',
      idempotencyKey: String(input.idempotencyKey),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.conn.collection('fraud_alerts').insertOne(doc as unknown as Record<string, unknown>);
    return doc;
  }

  async scoreUser(userId: string): Promise<UserRiskScores> {
    const uid = String(userId);
    const since24h = this.hoursAgo(24);
    const since1h = this.hoursAgo(1);
    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const user = (await this.conn.collection('users').findOne({ id: { $eq: uid } })) as unknown as Record<
      string,
      unknown
    > | null;
    const accountAgeDays = user?.['createdAt'] instanceof Date
      ? Math.max(0, (Date.now() - (user['createdAt'] as Date).getTime()) / 86_400_000)
      : 9999;

    const orders = (await this.conn
      .collection('orders')
      .find({ patient_id: { $eq: uid } })
      .limit(500)
      .toArray()) as unknown as Array<Record<string, unknown>>;
    const codOrders = orders.filter((o) => String(o['payment_method'] || 'cash').toLowerCase() !== 'card');
    const codCancelled = codOrders.filter((o) =>
      ['CANCELLED', 'cancelled'].includes(String(o['status'] || o['state'] || '')),
    );
    const codUnpaid = codOrders.filter(
      (o) => String(o['payment_status'] || '') !== 'paid' && String(o['status'] || o['state'] || '') === 'DELIVERED',
    );
    const completed = orders.filter((o) =>
      ['DELIVERED', 'COMPLETED', 'delivered', 'completed'].includes(String(o['status'] || o['state'] || '')),
    ).length;
    const lastOrder = orders[orders.length - 1];
    const fakeOrder = scoreFakeOrder({
      isCod: codOrders.length > 0,
      accountAgeDays,
      orderTotal: Number(lastOrder?.['total'] || lastOrder?.['grand_total'] || 0),
      priorCompletedOrders: completed,
      addressChangesLast24h: 0,
      phonesOnSameDevice: Array.isArray(user?.['device_tokens']) ? (user?.['device_tokens'] as unknown[]).length : 0,
    });

    const codAbuse = scoreCodAbuse({ codOrders: codOrders.length, codCancelled: codCancelled.length, codUnpaid: codUnpaid.length });

    const deviceTokens = Array.isArray(user?.['device_tokens']) ? (user?.['device_tokens'] as unknown[]) : [];
    const sameDeviceCount = deviceTokens.length > 0 ? deviceTokens.length : 0;
    // NOTE: phone-prefix clustering needs a prefix scan the $eq-only query
    // rule forbids; farm signal here = device-token count + registration burst.
    const regs24h = await this.conn
      .collection('users')
      .countDocuments({ createdAt: { $gte: since24h } } as unknown as Record<string, unknown>)
      .catch(() => 0);
    const accountFarm = scoreAccountFarm({
      accountsOnDevice: sameDeviceCount,
      accountsSamePhonePrefix: 0,
      registrationsLast24h: regs24h,
    });

    const failures1h = await this.conn
      .collection('coupon_failures')
      .countDocuments({ user_id: { $eq: uid }, at: { $gte: since1h } } as unknown as Record<string, unknown>)
      .catch(() => 0);
    const failuresRows = (await this.conn
      .collection('coupon_failures')
      .find({ user_id: { $eq: uid } })
      .limit(100)
      .toArray()
      .catch(() => [])) as unknown as Array<Record<string, unknown>>;
    const usages24h = await this.conn
      .collection('coupon_usages')
      .countDocuments({ user_id: { $eq: uid } } as unknown as Record<string, unknown>)
      .catch(() => 0);
    void since30d;
    const promoAbuse = scorePromoAbuse({
      couponFailuresLast1h: failures1h,
      distinctCodesFailed: new Set(failuresRows.map((r) => String(r['code'] || ''))).size,
      usagesLast24h: usages24h,
    });

    const failed1h = await this.conn
      .collection('moyasar_payments')
      .countDocuments({ patient_id: { $eq: uid }, status: { $eq: 'failed' }, createdAt: { $gte: since1h } } as unknown as Record<string, unknown>)
      .catch(() => 0);
    const paidRows = (await this.conn
      .collection('moyasar_payments')
      .find({ patient_id: { $eq: uid }, status: { $eq: 'paid' } })
      .limit(200)
      .toArray()
      .catch(() => [])) as unknown as Array<Record<string, unknown>>;
    const bookingIds = paidRows.map((p) => String(p['booking_id'] || ''));
    const duplicatePaidForBooking = new Set(bookingIds).size < bookingIds.length && bookingIds.length > 0;
    const paymentFraud = scorePaymentFraud({
      failedLast1h: failed1h,
      distinctCardsFailed: 0,
      duplicatePaidForBooking,
      amountVsMedianRatio: 1,
    });

    const { score, action } = aggregateRisk([fakeOrder, codAbuse, accountFarm, promoAbuse, paymentFraud]);
    return { userId: uid, fakeOrder, codAbuse, accountFarm, promoAbuse, paymentFraud, combined: score, action };
  }

  threeDS(input: { paymentMethod: string; riskScore: number; orderTotal: number; provider?: string }) {
    return { capabilities: gateway3DSCapabilities(), decision: threeDSHook(input) };
  }

  async queue(status?: string, flagType?: string, limit = 50): Promise<Array<Record<string, unknown>>> {
    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = { $eq: status };
    if (flagType) filter['flagType'] = { $eq: flagType };
    const rows = await this.conn
      .collection('fraud_alerts')
      .find(filter)
      .limit(Math.min(100, Math.max(1, limit)))
      .toArray();
    return (rows as unknown as Array<Record<string, unknown>>).map((r) => {
      const { _id, ...rest } = r;
      void _id;
      return rest;
    });
  }

  async actOnAlert(id: string, action: 'acknowledge' | 'dismiss' | 'escalate', reason: string, idempotencyKey: string) {
    const dup = await this.conn.collection('risk_actions').findOne({ idempotencyKey: { $eq: idempotencyKey } });
    if (dup) {
      const { _id, ...rest } = dup as unknown as Record<string, unknown>;
      void _id;
      return rest;
    }
    const status = action === 'dismiss' ? 'dismissed' : action === 'escalate' ? 'flagged' : 'pending';
    await this.conn.collection('fraud_alerts').updateOne(
      { id: { $eq: String(id) } },
      { $set: { status, updatedAt: new Date() } },
    );
    const record = {
      id: this.newId('ra'),
      alertId: String(id),
      action,
      reason: String(reason),
      idempotencyKey: String(idempotencyKey),
      createdAt: new Date(),
    };
    await this.conn.collection('risk_actions').insertOne(record as unknown as Record<string, unknown>);
    return record;
  }
}
