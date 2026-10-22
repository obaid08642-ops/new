import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PharmacyOrderService } from './pharmacy-order.service';
import { catalogueFlags } from './rx-rules';
import { PharmacyOrderState } from '../schemas/pharmacy.schema';

/** 22.1 refill errors (409). The client never sends a validity date or a refill count: both are read from the prescription. */
export const REFILL_ERROR = {
  prescriptionRequired: 'prescription_required',
  validityUnknown: 'prescription_validity_unknown',
  expired: 'prescription_expired',
  refillsExhausted: 'prescription_refills_exhausted',
} as const;

interface SourceLine {
  raw_name?: string; name_ar?: string; name_en?: string; generic_name?: string; medicine_id?: string;
  dosage?: string; form?: string; frequency?: string; duration?: string; qty?: number; matched_sku?: string; notes?: string;
}

interface SourceOrder {
  id: string; items: SourceLine[]; prescription_id?: string; fulfillment?: string; payment_mode?: string;
  payment_method?: string; insurance_policy_id?: string; delivery_address_id?: string; delivery_address?: Record<string, unknown>;
}

interface PrescriptionRecord { id: string; valid_until?: Date | string; refills_remaining?: number }

/**
 * 22.1 repeat and refill. A refill is an ordinary pharmacy order from the same path as any order (create, then submit,
 * which broadcasts it to pharmacies). It makes no payment of its own and copies no price: the lines are re-read as
 * names, catalogue ids and quantities, and the pharmacy prices them as usual.
 * A prescription line needs a valid prescription on the server: an existing validity date and refill count, not expired,
 * at least one refill left. The refill count is taken with a conditional update, so two refills cannot use the last one.
 */
@Injectable()
export class PharmacyRefillService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly orders: PharmacyOrderService,
  ) {}

  async refill(user: { id: string; role: string }, orderId: string, now: Date = new Date()) {
    if (!user || user.role !== 'patient') throw new ForbiddenException('patient_scope_required');
    const source = (await this.conn.collection('pharmacy_orders').findOne(
      { id: orderId, patient_account_id: user.id },
      { projection: { _id: 0 } },
    )) as unknown as SourceOrder | null;
    if (!source) throw new NotFoundException('order_not_found');
    const items = Array.isArray(source.items) ? source.items : [];
    if (!items.length) throw new ConflictException('order_has_no_items');

    const needsPrescription = (await catalogueFlags(this.conn, items)).some((f) => f.requires_prescription || f.controlled);
    let rx: PrescriptionRecord | null = null;
    if (needsPrescription) {
      if (!source.prescription_id) throw new ConflictException(REFILL_ERROR.prescriptionRequired);
      rx = await this.readPrescription(user.id, source.prescription_id);
      if (!rx) throw new NotFoundException('prescription_not_found');
      if (!rx.valid_until || typeof rx.refills_remaining !== 'number') throw new ConflictException(REFILL_ERROR.validityUnknown);
      if (new Date(rx.valid_until).getTime() <= now.getTime()) throw new ConflictException(REFILL_ERROR.expired);
      if (rx.refills_remaining < 1) throw new ConflictException(REFILL_ERROR.refillsExhausted);
    }

    // the draft is created first, so a refill that is refused or fails later leaves nothing behind but a cancelled draft
    const draft = await this.orders.create(user, {
      // no ids, no prices: the lines are read again and priced by the pharmacy
      items: items.map((l) => ({
        raw_name: l.raw_name, name_ar: l.name_ar, name_en: l.name_en, generic_name: l.generic_name, medicine_id: l.medicine_id,
        dosage: l.dosage, form: l.form, frequency: l.frequency, duration: l.duration, qty: l.qty, sku: l.matched_sku, notes: l.notes,
      })),
      prescription_id: rx ? rx.id : undefined,
      fulfillment: source.fulfillment,
      payment_mode: source.payment_mode,
      payment_method: source.payment_method,
      insurance_policy_id: source.insurance_policy_id,
      delivery_address_id: source.delivery_address_id,
      delivery_address: source.delivery_address,
    });

    // one refill is taken now, conditionally: a concurrent refill that took the last one makes this one a 409
    if (rx) {
      const taken = await this.conn.collection('prescriptions').updateOne(
        { id: rx.id, patient_id: user.id, refills_remaining: { $gte: 1 }, valid_until: { $gt: now } },
        { $inc: { refills_remaining: -1 } },
      );
      if (taken.modifiedCount !== 1) {
        await this.cancelDraft(user, draft.id);
        const current = await this.readPrescription(user.id, rx.id);
        if (!current || !current.valid_until || new Date(current.valid_until).getTime() <= now.getTime()) throw new ConflictException(REFILL_ERROR.expired);
        throw new ConflictException(REFILL_ERROR.refillsExhausted);
      }
    }

    try {
      return await this.orders.submit(user, draft.id);
    } catch (err) {
      // only a draft that never reached the pharmacies is cancelled and gives its refill back; once it is out, the refill stays used
      const after = (await this.conn.collection('pharmacy_orders').findOne({ id: draft.id }, { projection: { _id: 0, status: 1 } })) as { status?: string } | null;
      if (after?.status === PharmacyOrderState.DRAFT) {
        await this.cancelDraft(user, draft.id);
        if (rx) await this.conn.collection('prescriptions').updateOne({ id: rx.id }, { $inc: { refills_remaining: 1 } }).catch(() => undefined);
      }
      throw err;
    }
  }

  private readPrescription(patientId: string, prescriptionId: string) {
    return this.conn.collection('prescriptions').findOne(
      { id: prescriptionId, patient_id: patientId },
      { projection: { _id: 0, id: 1, valid_until: 1, refills_remaining: 1 } },
    ) as unknown as Promise<PrescriptionRecord | null>;
  }

  /** The draft is only ever this patient's own, created a moment ago: a failed cancel leaves it as a draft, which is harmless. */
  private async cancelDraft(user: { id: string; role: string }, draftId: string) {
    await this.orders.cancel(user, draftId, 'refill_not_submitted').catch(() => undefined);
  }
}
