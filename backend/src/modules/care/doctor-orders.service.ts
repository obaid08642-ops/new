import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPriority, NotificationType } from '../../common/enums';

export type DoctorOrderKind = 'lab' | 'radiology' | 'nursing';
const CATALOG: Record<DoctorOrderKind, string> = { lab: 'lab_services', radiology: 'radiology_services', nursing: 'nursing_services' };
const ORDERABLE_APPT_STATES = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'];

/**
 * WP-K: a doctor orders lab tests, scans or nursing for the patient of their
 * own appointment. The order names real catalog services; the patient is
 * notified and books it from their app or the website.
 */
@Injectable()
export class DoctorOrdersService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private get orders() { return this.conn.collection('doctor_orders'); }

  async create(user: any, body: { appointment_id: string; kind: DoctorOrderKind; service_ids: string[]; notes?: string }) {
    if (user?.role !== 'doctor') throw new ForbiddenException('doctor_only');
    const appt: any = await this.conn.collection('appointments').findOne({ id: { $eq: String(body.appointment_id) } });
    if (!appt || String(appt.doctor_user_id) !== String(user.id)) throw new NotFoundException('appointment_not_found');
    if (!ORDERABLE_APPT_STATES.includes(String(appt.status).toUpperCase())) throw new BadRequestException('appointment_not_active');
    const ids = [...new Set((body.service_ids || []).map(String))];
    if (!ids.length || ids.length > 20) throw new BadRequestException('service_ids_required');
    const services: any[] = await this.conn.collection(CATALOG[body.kind]).find({ id: { $in: ids }, is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1 } }).toArray();
    if (services.length !== ids.length) throw new BadRequestException('unknown_service');
    const byId = new Map(services.map((s) => [String(s.id), s]));
    const order = {
      id: randomUUID(),
      appointment_id: String(appt.id),
      patient_id: String(appt.patient_id),
      doctor_user_id: String(user.id),
      kind: body.kind,
      items: ids.map((id) => ({ service_id: id, name_ar: byId.get(id)?.name_ar ?? null, name_en: byId.get(id)?.name_en ?? null })),
      notes: body.notes ? String(body.notes).slice(0, 1000) : null,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.orders.insertOne({ ...order });
    await this.notifications?.create({
      user_id: order.patient_id,
      title_key: 'طلب من طبيبك',
      body_key: body.kind === 'nursing' ? 'طلب طبيبك خدمة تمريض منزلي. اضغط لعرضها وحجزها.' : 'طلب طبيبك فحوصات. اضغط لعرضها وحجزها.',
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { route: '/health/actionable-order', payload: { order_id: order.id } },
    }).catch(() => null);
    return order;
  }

  async forPatient(user: any): Promise<Record<string, unknown>[]> {
    return this.orders.find({ patient_id: { $eq: String(user?.id) } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
  }

  async forDoctor(user: any): Promise<Record<string, unknown>[]> {
    if (user?.role !== 'doctor') throw new ForbiddenException('doctor_only');
    return this.orders.find({ doctor_user_id: { $eq: String(user.id) } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
  }
}
