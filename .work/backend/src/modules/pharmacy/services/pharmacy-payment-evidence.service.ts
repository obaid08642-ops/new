import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

/**
 * Canonical writer for payment evidence used by pharmacy fulfillment gates.
 * It is fed only by a verified gateway event listener; no controller accepts
 * evidence fields from a patient or provider.
 */
@Injectable()
export class PharmacyPaymentEvidenceService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @OnEvent('moyasar.payment.paid', { async: true })
  async onMoyasarPaid(payload: any) {
    return this.recordVerifiedGatewayPayment('moyasar', payload);
  }

  async recordVerifiedGatewayPayment(gateway: string, payload: any) {
    const eventId = String(payload?.webhook_event_id || payload?.event_id || payload?.id || '').trim();
    const paymentId = String(payload?.gateway_payment_id || payload?.payment_id || payload?.id || '').trim();
    const metadata = payload?.metadata || payload?.meta || {};
    const orderId = String(metadata.order_id || payload?.order_id || payload?.booking_id || '').trim();
    const offerId = String(metadata.selected_offer_id || payload?.selected_offer_id || '').trim();
    const offerVersion = Number(metadata.selected_offer_version ?? payload?.selected_offer_version);
    const snapshotHash = String(metadata.quote_snapshot_hash || payload?.quote_snapshot_hash || '').trim();
    const payerId = String(metadata.payer_account_id || payload?.payer_account_id || '').trim();
    const currency = String(payload?.currency || metadata.currency || 'SAR').toUpperCase();
    const amountHalalas = Number(payload?.amount_halalas ?? payload?.amount_minor ?? NaN);
    if (!eventId || !paymentId || !orderId || !offerId || !Number.isInteger(offerVersion) || !snapshotHash || !payerId || !Number.isFinite(amountHalalas) || amountHalalas < 0) {
      throw new BadRequestException('payment_evidence_metadata_incomplete');
    }
    const amount = Math.round((amountHalalas / 100) * 100) / 100;
    const orders = this.conn.collection('pharmacy_orders');
    const order: any = await orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('pharmacy_order_not_found');
    if (String(order.patient_account_id) !== payerId) throw new BadRequestException('payment_payer_mismatch');
    if (String(order.selected_offer_id) !== offerId || Number(order.selected_offer_version) !== offerVersion) throw new BadRequestException('payment_selected_offer_mismatch');
    if (String(order.pricing_snapshot?.offer_id) !== offerId || Number(order.pricing_snapshot?.offer_version) !== offerVersion) throw new BadRequestException('payment_quote_binding_mismatch');
    if (String(order.pricing_snapshot?.hash || '') !== snapshotHash) throw new BadRequestException('payment_quote_hash_mismatch');
    if (String(order.pricing_snapshot?.totals?.currency || 'SAR').toUpperCase() !== currency) throw new BadRequestException('payment_currency_mismatch');
    const expected = Math.round(Number(order.pricing_snapshot?.totals?.total || 0) * 100) / 100;
    if (amount !== expected) throw new BadRequestException('payment_amount_mismatch');
    if (['cancelled', 'expired'].includes(String(order.status))) throw new BadRequestException('payment_order_not_collectable');

    const evidence = {
      order_id: orderId, selected_offer_id: offerId, selected_offer_version: offerVersion,
      quote_snapshot_hash: snapshotHash, amount, currency, payer_account_id: payerId,
      gateway, gateway_payment_id: paymentId, webhook_event_id: eventId,
      status: 'confirmed', confirmed_at: new Date(), updatedAt: new Date(),
      evidence_fingerprint: crypto.createHash('sha256').update(`${gateway}:${paymentId}:${eventId}:${orderId}:${offerId}:${offerVersion}:${snapshotHash}:${amount}:${currency}:${payerId}`).digest('hex'),
    };
    const collection = this.conn.collection('pharmacy_payment_evidence');
    try {
      await collection.updateOne(
        { gateway, gateway_payment_id: paymentId, webhook_event_id: eventId },
        { $setOnInsert: { ...evidence, createdAt: new Date() } },
        { upsert: true },
      );
    } catch (err: any) {
      if (err?.code !== 11000) throw err;
      const existing: any = await collection.findOne({ gateway, gateway_payment_id: paymentId, webhook_event_id: eventId });
      if (!existing || existing.evidence_fingerprint !== evidence.evidence_fingerprint) throw new BadRequestException('payment_evidence_replay_conflict');
    }
    return { recorded: true, idempotent: true, order_id: orderId, gateway_payment_id: paymentId };
  }
}
