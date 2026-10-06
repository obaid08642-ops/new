import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderState } from '../../common/enums';
import { OrderRepository } from './repositories/order.repository';
import { MedicineRepository } from './repositories/medicine.repository';
import { DispatchService } from './dispatch.service';
import { isGovernedPharmacyFlow } from './orders.service';
import {
  CouponService,
  LoyaltyRedeemService,
  RefundExecutor,
} from '../finance-engine/finance-engine.module';

const EDITABLE_STATES = [OrderState.CREATED, OrderState.VALIDATED];
const SPLITTABLE_STATES = [
  OrderState.CREATED,
  OrderState.VALIDATED,
  OrderState.PHARMACY_RECEIVED,
];
const POST_DELIVERY = [
  OrderState.DELIVERED,
  OrderState.COMPLETED,
  OrderState.PARTIALLY_FULFILLED,
];

interface OrderDoc {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_phone?: string;
  pharmacy_id?: string;
  prescription_id?: string;
  items: Array<Record<string, unknown>>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  state: string;
  state_history: Array<Record<string, unknown>>;
  delivery_mode?: string;
  delivery_address?: { lat?: number; lng?: number };
  payment_method?: string;
  payment_status?: string;
  coupon_code?: string;
  loyalty_points_used?: number;
  is_split?: boolean;
  sub_order_ids?: string[];
  parent_order_id?: string;
  createdAt?: string | Date;
  save: () => Promise<unknown>;
  toObject: () => Record<string, unknown>;
}

/**
 * P22.5 — order changes on the legacy /orders surface:
 * edit-before-accept, explicit partial refunds (via the existing RefundExecutor,
 * read-only), and split orchestration with atomic stock allocation.
 */
@Injectable()
export class OrderAmendmentService {
  constructor(
    @Inject('OrderRepository') private readonly orders: OrderRepository,
    @Inject('MedicineRepository') private readonly meds: MedicineRepository,
    @InjectConnection() private readonly conn: Connection,
    private readonly events: EventEmitter2,
    private readonly dispatch: DispatchService,
    private readonly refundExec: RefundExecutor,
    private readonly coupons: CouponService,
    private readonly loyaltyRedeem: LoyaltyRedeemService,
  ) {}

  private assertAccess(order: OrderDoc, by: { id: string; role: string }): void {
    const role = String(by.role || '').toLowerCase();
    if (role === 'admin' || role === 'super_admin') return;
    if (role === 'patient' && order.patient_id === by.id) return;
    if (
      (role === 'pharmacy' || role === 'provider') &&
      order.pharmacy_id === by.id
    )
      return;
    throw new NotFoundException('order_not_found');
  }

  private async load(
    orderId: string,
    by: { id: string; role: string },
    patientScoped: boolean,
  ): Promise<OrderDoc> {
    const filter: Record<string, unknown> = { id: { $eq: String(orderId) } };
    if (patientScoped) filter['patient_id'] = { $eq: String(by.id) };
    const doc = (await this.orders.findOne(
      filter as never,
    )) as unknown as OrderDoc | null;
    if (!doc) throw new NotFoundException('order_not_found');
    if (isGovernedPharmacyFlow(doc))
      throw new ForbiddenException('canonical_pharmacy_flow_required');
    if (!patientScoped) this.assertAccess(doc, by);
    return doc;
  }

  /**
   * Edit items before the pharmacy accepts. Unpaid orders only; totals are
   * recomputed from catalog prices and prior coupon/loyalty usage is released
   * (idempotent) so money can never double-count.
   */
  async editItems(
    orderId: string,
    by: { id: string; role: string },
    items: Array<{ medicine_id: string; qty: number }>,
  ): Promise<Record<string, unknown>> {
    const admin = String(by.role || '').toLowerCase() === 'admin';
    const order = await this.load(orderId, by, !admin);
    if (!EDITABLE_STATES.includes(order.state as OrderState))
      throw new BadRequestException(
        `order_not_editable: pharmacy already ${order.state}`,
      );
    if (String(order.payment_status || 'pending') === 'paid')
      throw new BadRequestException('edit_not_allowed_paid');
    if (!Array.isArray(items) || items.length === 0)
      throw new BadRequestException('items_required');
    if (items.length > 50) throw new BadRequestException('too_many_items');

    const ids = [...new Set(items.map((i) => String(i.medicine_id)))];
    const found = (await this.meds.find(
      { id: { $in: ids } },
      { _id: 0, __v: 0 },
    )) as unknown as { lean?: () => Promise<Array<Record<string, unknown>>> };
    const meds =
      typeof found?.lean === 'function'
        ? await found.lean()
        : ((found as unknown) as Array<Record<string, unknown>>);
    const byId = new Map((meds || []).map((m) => [String(m['id']), m]));
    const unknown = ids.filter((id) => !byId.has(id));
    if (unknown.length > 0)
      throw new BadRequestException(`unknown_medicines: ${unknown.join(',')}`);
    const needsRx = ids.some(
      (id) => byId.get(id)?.['requires_prescription'] === true,
    );
    if (needsRx && !order.prescription_id)
      throw new BadRequestException('prescription_required');

    // Release prior discounts before recomputing (both idempotent, never block).
    if (order.coupon_code) {
      try {
        await this.coupons.release(order.id);
      } catch {
        /* never block the edit */
      }
    }
    if (Number(order.loyalty_points_used || 0) > 0) {
      try {
        await this.loyaltyRedeem.refundRedemption(order.patient_id, order.id);
      } catch {
        /* never block the edit */
      }
    }

    order.items = items.map((it) => {
      const m = byId.get(String(it.medicine_id)) as Record<string, unknown>;
      const qty = Math.max(1, Math.floor(Number(it.qty)) || 1);
      return {
        medicine_id: String(it.medicine_id),
        name_ar: String(m['name_ar'] ?? ''),
        name_en: String(m['name_en'] ?? ''),
        qty,
        price: Number(m['price'] ?? 0),
        image: String(m['image'] ?? ''),
      };
    });
    order.subtotal = order.items.reduce(
      (s, it) => s + Number(it['price'] ?? 0) * Number(it['qty'] ?? 0),
      0,
    );
    order.total = order.subtotal + Number(order.delivery_fee || 0);
    order.coupon_code = undefined;
    order.loyalty_points_used = 0;
    order.state_history.push({
      from: order.state,
      to: order.state,
      by_user_id: by.id,
      by_role: by.role,
      reason: 'patient-edit-before-accept',
      at: new Date(),
    });
    await order.save();
    this.events.emit('order.edited', { order_id: order.id, by: by.id });
    return order.toObject();
  }

  /**
   * Explicit partial refund (e.g. an item removed after accept). Uses the
   * existing RefundExecutor — idempotent per (order, amount).
   */
  async refundPartial(
    orderId: string,
    by: { id: string; role: string },
    amount: number,
    reason?: string,
  ): Promise<{ ok: boolean; refund_id: string; amount: number }> {
    const order = await this.load(orderId, by, false);
    if (POST_DELIVERY.includes(order.state as OrderState))
      throw new BadRequestException('use_returns_flow');
    const value = Math.round(Number(amount) * 100) / 100;
    if (!(value > 0)) throw new BadRequestException('invalid_refund_amount');
    if (value > Number(order.total || 0))
      throw new BadRequestException('refund_exceeds_total');
    const refundId = `partial_${order.id}_${String(value).replace('.', '_')}`;
    await this.refundExec.execute({
      refund_id: refundId,
      booking_kind: 'pharmacy',
      booking_id: order.id,
      patient_id: order.patient_id,
      amount: value,
      reason: reason || `partial refund by ${by.role}`,
      actor_id: by.id,
    });
    await this.orders.updateOne(
      { id: { $eq: order.id } } as never,
      {
        $set: {
          refund_status: 'PARTIALLY_REFUNDED',
          refunded_at: new Date(),
        },
      } as never,
    );
    return { ok: true, refund_id: refundId, amount: value };
  }

  /**
   * Split when the assigned pharmacy cannot fill everything: the shortfall is
   * allocated to the next-best pharmacy with ATOMIC stock reservation
   * (tryDeductStock). A lost race restores partial takes and reports 409 —
   * the same unit is never allocated twice.
   */
  async splitOrder(
    orderId: string,
    by: { id: string; role: string },
    origin?: { lat: number; lng: number },
  ): Promise<Record<string, unknown>> {
    const order = await this.load(orderId, by, false);
    if (!SPLITTABLE_STATES.includes(order.state as OrderState))
      throw new BadRequestException(`order_not_splittable: ${order.state}`);
    if (!order.pharmacy_id) throw new BadRequestException('split_needs_primary');
    const at = origin ??
      (order.delivery_address?.lat && order.delivery_address?.lng
        ? {
            lat: Number(order.delivery_address.lat),
            lng: Number(order.delivery_address.lng),
          }
        : null);
    if (!at) throw new BadRequestException('dispatch_origin_required');

    const lines = order.items.map((it) => ({
      medicine_id: String(it['medicine_id'] ?? ''),
      qty: Math.max(1, Number(it['qty'] ?? 1) || 1),
    }));
    const stock = await this.dispatch.getInventoryFor(
      String(order.pharmacy_id),
      lines.map((l) => l.medicine_id),
    );
    const shortfall = lines.filter((l) => (stock[l.medicine_id] ?? 0) < l.qty);
    if (shortfall.length === 0) throw new BadRequestException('nothing_to_split');

    const secondary = await this.dispatch.dispatchSplit(at, shortfall, [
      String(order.pharmacy_id),
    ]);
    if (!secondary.ok || !secondary.selected_pharmacy_id)
      throw new BadRequestException('no_split_candidate');
    const target = String(secondary.selected_pharmacy_id);
    const movable = secondary.fulfilled_items as Array<{
      medicine_id: string;
      qty: number;
    }>;
    if (movable.length === 0) throw new BadRequestException('no_split_candidate');

    // Atomic reservation; on any lost race, restore takes and fail loudly.
    const taken: Array<{ medicine_id: string; qty: number }> = [];
    for (const it of movable) {
      const ok = await this.dispatch.tryDeductStock(
        target,
        it.medicine_id,
        it.qty,
      );
      if (!ok) {
        if (taken.length > 0) {
          try {
            await this.dispatch.restoreStock(target, taken);
          } catch {
              /* restore is best-effort; the race is already reported */
          }
        }
        throw new ConflictException('split_stock_race: retry the split');
      }
      taken.push({ medicine_id: it.medicine_id, qty: it.qty });
    }

    const movedIds = new Set(movable.map((m) => m.medicine_id));
    const movedLines = order.items.filter((it) =>
      movedIds.has(String(it['medicine_id'])),
    );
    const keptLines = order.items.filter(
      (it) => !movedIds.has(String(it['medicine_id'])),
    );
    const lineTotal = (ls: Array<Record<string, unknown>>): number =>
      ls.reduce(
        (s, it) => s + Number(it['price'] ?? 0) * Number(it['qty'] ?? 0),
        0,
      );
    const sub = (await this.orders.create({
      id: uuidv4(),
      patient_id: order.patient_id,
      patient_name: order.patient_name,
      patient_phone: order.patient_phone,
      pharmacy_id: target,
      items: movedLines,
      subtotal: lineTotal(movedLines),
      delivery_fee: 0,
      total: lineTotal(movedLines),
      delivery_mode: order.delivery_mode || 'DELIVERY',
      delivery_address: order.delivery_address,
      payment_method: order.payment_method || 'cash',
      payment_status: 'pending',
      state: OrderState.CREATED,
      state_history: [
        {
          from: '',
          to: OrderState.CREATED,
          by_user_id: by.id,
          by_role: by.role,
          reason: `split_from_${order.id}`,
          at: new Date(),
        },
      ],
      is_split: true,
      parent_order_id: order.id,
    } as never)) as unknown as { id: string };

    order.items = keptLines;
    order.subtotal = lineTotal(keptLines);
    order.total = order.subtotal + Number(order.delivery_fee || 0);
    order.is_split = true;
    order.sub_order_ids = [...(order.sub_order_ids || []), String((sub as { id: string }).id)];
    order.state_history.push({
      from: order.state,
      to: order.state,
      by_user_id: by.id,
      by_role: by.role,
      reason: `split_shortfall_to_${target}`,
      at: new Date(),
    });
    await order.save();
    this.events.emit('order.split', {
      order_id: order.id,
      sub_order_id: String((sub as { id: string }).id),
      pharmacy_id: target,
    });
    return order.toObject();
  }
}
