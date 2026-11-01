import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Connection } from 'mongoose';
import { recordAudit } from '../../common/audit-record';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { LinkBookingDto, MedicalOrderDto } from './medical-orders.dto';

// M2 — the doctor's structured medical order (docs/product/ORDERING_MODEL_2026-10-16.md phase M2, ORDERING_UX_SPEC §2.3).
// The doctor writes one order after a visit: labs, radiology, nursing sessions and a link to the e-prescription. The doctor
// never picks the provider. The patient orders each group through its own flow later; the order itself is not a booking.

export type OrderGroup = 'labs' | 'radiology' | 'nursing';
type ItemStatus = 'open' | 'ordered' | 'later';

export interface OrderItem {
  id: string;
  group: OrderGroup;
  catalog_id: string;
  status: ItemStatus;
  sessions?: number;
  interval_days?: number | null;
  booking_id?: string;
  booking_kind?: OrderGroup;
}
interface MedicalOrderDoc {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  prescription_id: string | null;
  status: 'active';
  valid_days: number;
  valid_until: Date;
  notes: string | null;
  items: OrderItem[];
  createdAt: Date;
  renew_requested_at?: Date;
}

const DAY = 86_400_000;
const VALID_DAYS = [30, 90, 180];
const EXPIRY_WARNING_DAYS = 3;
const MAX_SESSIONS = 30;
// Appointments are stored upper case (APPT_STATES); rows written before that rule may be lower case, so both match.
const VISITED = ['COMPLETED', 'IN_PROGRESS', 'completed', 'in_progress'];
const statusIs = (status: unknown, want: 'completed' | 'in_progress') => String(status ?? '').toLowerCase() === want;
/** How long after a completed visit the doctor may still write the order (SystemConfig `medical_order_after_visit_days`). */
const DEFAULT_AFTER_VISIT_DAYS = 30;
const MAX_AFTER_VISIT_DAYS = 365;
const RECENT_VISITS_LIMIT = 50;
const VISIT_FIELDS = { _id: 0, id: 1, patient_id: 1, doctor_user_id: 1, provider_id: 1, status: 1, completed_at: 1, ended_at: 1, updatedAt: 1, scheduled_at: 1, slot_start: 1, createdAt: 1 } as const;
interface VisitRow {
  id: string; patient_id: string; doctor_user_id?: string; provider_id?: string; status?: string;
  completed_at?: Date; ended_at?: Date; updatedAt?: Date; scheduled_at?: Date; slot_start?: Date; createdAt?: Date;
}
const SERVICE_KIND: Record<OrderGroup, 'lab' | 'radiology' | 'nursing'> = { labs: 'lab', radiology: 'radiology', nursing: 'nursing' };
const CATALOG: Record<OrderGroup, string> = {
  labs: CATALOG_COLLECTIONS.lab_services,
  radiology: CATALOG_COLLECTIONS.radiology_services,
  nursing: CATALOG_COLLECTIONS.nursing_services,
};
// Where the booking that fulfils an item lives (the patient's own booking is checked before it is linked).
const BOOKINGS: Record<OrderGroup, string> = { labs: 'lab_bookings', radiology: 'radiology_bookings', nursing: 'home_care_bookings' };
const GROUPS: OrderGroup[] = ['labs', 'radiology', 'nursing'];

const bad = (code: string) => new BadRequestException(code);

@Injectable()
export class MedicalOrdersService implements OnModuleInit {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  /** Indexes for the order lookups and one renew request per order and patient. Idempotent. */
  async onModuleInit() {
    await this.conn.collection('medical_orders').createIndex({ id: 1 }, { unique: true, name: 'medical_order_id_unique' });
    await this.conn.collection('medical_orders').createIndex({ patient_id: 1, createdAt: -1 }, { name: 'medical_order_patient' });
    await this.conn.collection('medical_orders').createIndex({ doctor_id: 1 }, { name: 'medical_order_doctor' });
    await this.conn.collection('medical_order_renew_requests').createIndex({ doctor_id: 1, requested_at: -1 }, { name: 'renew_doctor' });
    await this.conn.collection('medical_order_renew_requests').createIndex({ order_id: 1, patient_id: 1 }, { unique: true, name: 'renew_order_patient_unique' });
  }

  private orders() { return this.conn.collection('medical_orders'); }
  private renewals() { return this.conn.collection('medical_order_renew_requests'); }

  // ---------- writing (doctor) ----------

  async create(user: { id: string }, appointmentId: string, body: MedicalOrderDto) {
    const appt = await this.conn.collection('appointments').findOne({ id: appointmentId }, { projection: VISIT_FIELDS }) as unknown as VisitRow | null;
    if (!appt) throw new NotFoundException('appointment_not_found');
    if (appt.doctor_user_id !== user.id && appt.provider_id !== user.id) throw new ForbiddenException('not_your_appointment');
    if (!VISITED.includes(String(appt.status))) throw bad('appointment_not_visited');
    // A visit in progress is always open; a completed one only for the window after it ended.
    if (statusIs(appt.status, 'completed') && !this.withinWindow(appt, await this.afterVisitDays(), new Date())) throw bad('visit_window_closed');

    const items: OrderItem[] = [];
    for (const g of GROUPS) {
      const list = (body as Record<string, unknown>)[g] as Array<Record<string, unknown>> | undefined;
      for (const entry of list ?? []) {
        const catalogId = entry.catalog_id;
        if (typeof catalogId !== 'string' || !catalogId) throw bad('catalog_item_not_found');
        const row = await this.conn.collection(CATALOG[g]).findOne({ id: catalogId, active: { $ne: false } });
        if (!row) throw bad('catalog_item_not_found');
        if (g === 'nursing') {
          const sessions = entry.sessions ?? 1;
          if (typeof sessions !== 'number' || !Number.isInteger(sessions) || sessions < 1 || sessions > MAX_SESSIONS) throw bad('nursing_sessions_invalid');
          const interval = entry.interval_days;
          if (interval !== undefined && (typeof interval !== 'number' || interval < 0)) throw bad('nursing_interval_invalid');
          items.push({ id: randomUUID(), group: g, catalog_id: catalogId, status: 'open', sessions, interval_days: (interval as number | undefined) ?? null });
        } else {
          items.push({ id: randomUUID(), group: g, catalog_id: catalogId, status: 'open' });
        }
      }
    }

    let prescriptionId: string | null = null;
    if (body.prescription_id !== undefined) {
      const rx = await this.conn.collection('prescriptions').findOne(
        { id: body.prescription_id, patient_id: appt.patient_id, $or: [{ doctor_id: user.id }, { doctor_user_id: user.id }] },
        { projection: { _id: 1 } },
      );
      if (!rx) throw bad('prescription_not_found');
      prescriptionId = body.prescription_id;
    }
    if (items.length === 0 && !prescriptionId) throw bad('medical_order_empty');

    // Validity: 30 days by default when the order holds labs or radiology, 90 when it is nursing only.
    const hasTests = items.some((i) => i.group !== 'nursing');
    const validDays = body.valid_days ?? (hasTests ? 30 : 90);
    if (!VALID_DAYS.includes(validDays)) throw bad('valid_days_invalid');

    const now = new Date();
    const doc: MedicalOrderDoc = {
      id: randomUUID(),
      patient_id: appt.patient_id,
      doctor_id: user.id,
      appointment_id: appt.id,
      prescription_id: prescriptionId,
      status: 'active',
      valid_days: validDays,
      valid_until: new Date(now.getTime() + validDays * DAY),
      notes: body.notes ?? null,
      items,
      createdAt: now,
    };
    await this.orders().insertOne(doc as unknown as Record<string, unknown>);
    await recordAudit(this.conn, { action: 'medical_order.create', user_id: user.id, role: 'doctor', resource_kind: 'medical_order', resource_id: doc.id, details: { valid_days: validDays, items: items.length, prescription_id: prescriptionId } });
    return this.view(doc, now);
  }

  // ---------- visits the doctor can still write an order for ----------

  private async afterVisitDays(): Promise<number> {
    const doc = await this.conn.collection('system_configs').findOne({ key: 'medical_order_after_visit_days' }) as { value?: unknown } | null;
    const v = doc?.value;
    return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_AFTER_VISIT_DAYS ? v : DEFAULT_AFTER_VISIT_DAYS;
  }

  /** The moment a visit ended: its completion time, else the last update, else when it was scheduled or created. */
  private visitDate(a: VisitRow): Date | null {
    const at = a.completed_at ?? a.ended_at ?? a.updatedAt ?? a.scheduled_at ?? a.slot_start ?? a.createdAt;
    return at ? new Date(at) : null;
  }

  private withinWindow(a: VisitRow, days: number, now: Date): boolean {
    const at = this.visitDate(a);
    return !!at && now.getTime() - at.getTime() <= days * DAY;
  }

  /**
   * The doctor's own visits an order can be written for: in progress, or completed within the window. Only the visit id, its
   * status, the patient id and name, and the date leave here (no phone or notes).
   */
  async recentVisits(user: { id: string }) {
    const now = new Date();
    const days = await this.afterVisitDays();
    const rows = await this.conn.collection('appointments').find(
      { $or: [{ doctor_user_id: user.id }, { provider_id: user.id }], status: { $in: VISITED } },
      { projection: VISIT_FIELDS },
    ).sort({ createdAt: -1 }).limit(200).toArray() as unknown as VisitRow[];
    const open = rows
      .filter((a) => statusIs(a.status, 'in_progress') || this.withinWindow(a, days, now))
      .slice(0, RECENT_VISITS_LIMIT);
    // The patient's display name (full_name only) lets the doctor tell two visits on one day apart; the doctor already sees it
    // in the appointment. No phone or any other field of the patient leaves here.
    const ids = [...new Set(open.map((a) => a.patient_id).filter(Boolean))];
    const patients = ids.length
      ? await this.conn.collection('users').find({ id: { $in: ids } }, { projection: { _id: 0, id: 1, full_name: 1 } }).toArray() as unknown as Array<{ id: string; full_name?: string }>
      : [];
    const names = new Map(patients.map((u) => [u.id, typeof u.full_name === 'string' ? u.full_name : null]));
    return open.map((a) => ({
      id: a.id, status: a.status as string, patient_id: a.patient_id, patient_name: names.get(a.patient_id) ?? null,
      date: this.visitDate(a)?.toISOString() ?? null,
    }));
  }

  // ---------- reading ----------

  private expired(order: { valid_until: Date }, now: Date) { return new Date(order.valid_until).getTime() <= now.getTime(); }
  private expiresSoon(order: { valid_until: Date }, now: Date) {
    const left = new Date(order.valid_until).getTime() - now.getTime();
    return left > 0 && left <= EXPIRY_WARNING_DAYS * DAY;
  }

  /** The order as the clients show it: flat items plus one group per kind of service (and one for the e-prescription). */
  private view(order: MedicalOrderDoc, now: Date) {
    const groups: Record<string, { items?: OrderItem[]; prescription_id?: string }> = {};
    for (const g of GROUPS) {
      const items = order.items.filter((i) => i.group === g);
      if (items.length) groups[g] = { items };
    }
    if (order.prescription_id) groups.prescription = { prescription_id: order.prescription_id };
    return {
      id: order.id,
      status: order.status,
      valid_days: order.valid_days,
      valid_until: order.valid_until,
      expired: this.expired(order, now),
      expires_soon: !this.expired(order, now) && this.expiresSoon(order, now),
      notes: order.notes,
      appointment_id: order.appointment_id,
      prescription_id: order.prescription_id,
      items: order.items,
      groups,
    };
  }

  async mine(user: { id: string }, activeOnly: boolean) {
    const now = new Date();
    const rows = await this.orders().find({ patient_id: user.id }).sort({ createdAt: -1 }).toArray() as unknown as MedicalOrderDoc[];
    return rows
      .filter((o) => !activeOnly || (!this.expired(o, now) && o.items.some((i) => i.status !== 'ordered')))
      .map((o) => this.view(o, now));
  }

  /** The patient reads their own order; the doctor who wrote it reads it too. Anyone else gets a 404. */
  async getOne(user: { id: string; role?: string }, id: string) {
    const order = await this.load(id);
    const mine = order.patient_id === user.id || order.doctor_id === user.id;
    if (!mine) throw new NotFoundException('medical_order_not_found');
    return this.view(order, new Date());
  }

  async renewRequests(user: { id: string }) {
    const rows = await this.renewals().find({ doctor_id: user.id }).sort({ requested_at: -1 }).toArray() as unknown as Array<{ order_id: string; patient_id: string; requested_at: Date }>;
    return rows.map((r) => ({ order_id: r.order_id, patient_id: r.patient_id, requested_at: r.requested_at }));
  }

  // ---------- patient actions ----------

  private async load(id: string): Promise<MedicalOrderDoc> {
    const order = await this.orders().findOne({ id }) as unknown as MedicalOrderDoc | null;
    if (!order) throw new NotFoundException('medical_order_not_found');
    return order;
  }

  private async ownOrder(user: { id: string }, id: string): Promise<MedicalOrderDoc> {
    const order = await this.load(id);
    if (order.patient_id !== user.id) throw new NotFoundException('medical_order_not_found');
    return order;
  }

  private itemOf(order: MedicalOrderDoc, itemId: string): OrderItem {
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('medical_order_item_not_found');
    return item;
  }

  /** Prefill for the flow of the item's group: the item, or every still-open item of its group when `group_all`. */
  async order(user: { id: string }, orderId: string, itemId: string, groupAll: boolean) {
    const order = await this.ownOrder(user, orderId);
    if (this.expired(order, new Date())) throw new GoneException('medical_order_expired');
    const item = this.itemOf(order, itemId);
    const pick = groupAll
      ? order.items.filter((i) => i.group === item.group && i.status === 'open')
      : [item];
    return {
      prefill: {
        service_kind: SERVICE_KIND[item.group],
        medical_order_id: order.id,
        items: pick.map((i) => ({ item_id: i.id, catalog_id: i.catalog_id })),
      },
    };
  }

  private async setItem(order: MedicalOrderDoc, itemId: string, patch: Partial<OrderItem>) {
    await this.orders().updateOne(
      { id: order.id, 'items.id': itemId },
      { $set: Object.fromEntries(Object.entries(patch).map(([k, v]) => [`items.$.${k}`, v])) },
    );
  }

  async defer(user: { id: string }, orderId: string, itemId: string) {
    const order = await this.ownOrder(user, orderId);
    if (this.expired(order, new Date())) throw new GoneException('medical_order_expired');
    const item = this.itemOf(order, itemId);
    if (item.status !== 'open') throw new ConflictException('item_not_open');
    await this.setItem(order, itemId, { status: 'later' });
    return this.view({ ...order, items: order.items.map((i) => (i.id === itemId ? { ...i, status: 'later' as ItemStatus } : i)) }, new Date());
  }

  async linkBooking(user: { id: string }, orderId: string, itemId: string, body: LinkBookingDto) {
    const order = await this.ownOrder(user, orderId);
    if (this.expired(order, new Date())) throw new GoneException('medical_order_expired');
    const item = this.itemOf(order, itemId);
    if (SERVICE_KIND[item.group] !== body.booking_kind) throw bad('booking_kind_mismatch');
    if (item.status === 'ordered') throw new ConflictException('item_already_ordered');
    const booking = await this.conn.collection(BOOKINGS[item.group]).findOne({ id: body.booking_id }) as unknown as { patient_id?: string; user_id?: string } | null;
    if (!booking) throw new NotFoundException('booking_not_found');
    if (booking.patient_id !== user.id && booking.user_id !== user.id) throw new ForbiddenException('booking_not_yours');
    await this.setItem(order, itemId, { status: 'ordered', booking_id: body.booking_id, booking_kind: item.group });
    await recordAudit(this.conn, { action: 'medical_order.item_ordered', user_id: user.id, role: 'patient', resource_kind: 'medical_order', resource_id: order.id, details: { item_id: itemId, booking_id: body.booking_id } });
    return this.view({ ...order, items: order.items.map((i) => (i.id === itemId ? { ...i, status: 'ordered' as ItemStatus, booking_id: body.booking_id, booking_kind: item.group } : i)) }, new Date());
  }

  async renewRequest(user: { id: string }, orderId: string) {
    const order = await this.ownOrder(user, orderId);
    const now = new Date();
    if (!this.expired(order, now) && !this.expiresSoon(order, now)) throw bad('renew_not_needed');
    await this.renewals().updateOne(
      { order_id: order.id, patient_id: user.id },
      { $set: { doctor_id: order.doctor_id, requested_at: now } },
      { upsert: true },
    );
    await recordAudit(this.conn, { action: 'medical_order.renew_requested', user_id: user.id, role: 'patient', resource_kind: 'medical_order', resource_id: order.id });
    return { requested: true };
  }
}
