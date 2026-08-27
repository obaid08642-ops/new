import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ProviderRequest,
  ProviderRequestStatus,
  ProviderRequestType,
  PROVIDER_REQUEST_TRANSITIONS,
  ProviderRequestPriority,
} from '../schemas/requests.schema';
import { ProviderAuditLog } from '../schemas';
import { ProviderNotificationsService } from './provider-notifications.service';
import { ProviderScoringService } from './provider-scoring.service';
import { AssignmentStrategyService } from './assignment-strategy.service';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";
import { ProviderOperatorRepository } from './repositories/provideroperator.repository';
import { isProviderRole } from '../../../common/enums';

function assertProvider(user: any) {
  if (!user || !isProviderRole(user.role)) throw new ForbiddenException('provider scope required');
  return user;
}

@Injectable()
export class ProviderRequestEngineService {
  private logger = new Logger('ProviderRequestEngine');
  constructor(
    @Inject('ProviderRequestRepository') private requests: ProviderRequestRepository,
    @Inject('ProviderAuditLogRepository') private audit: ProviderAuditLogRepository,
    private readonly notifs: ProviderNotificationsService,
    private readonly scoring: ProviderScoringService,
    private readonly events: EventEmitter2,
    @Inject(forwardRef(() => AssignmentStrategyService)) private readonly assignment: AssignmentStrategyService,
    @Inject('ProviderOperatorRepository') private readonly operators: ProviderOperatorRepository,
  ) {}

  // ---------- LIST ----------
  async list(user: any, q: { status?: string; type?: string; limit?: string; offset?: string; q?: string }) {
    assertProvider(user);
    const filter: any = { provider_account_id: user.id };
    if (q.status) filter.status = q.status;
    if (q.type) filter.type = q.type;
    const limit = Math.min(parseInt(q.limit || '50', 10) || 50, 200);
    const offset = parseInt(q.offset || '0', 10) || 0;
    let queryChain = this.requests.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit);
    const items = await queryChain.lean();
    const total = await this.requests.countDocuments(filter);
    return { items, total, limit, offset };
  }

  async detail(user: any, id: string) {
    assertProvider(user);
    const r = await this.requests.findOne({ id, provider_account_id: user.id }).lean();
    if (!r) throw new NotFoundException('request not found');
    return r;
  }

  // ---------- STATE TRANSITIONS ----------
  private async transition(
    user: any,
    id: string,
    to: ProviderRequestStatus,
    action: 'accept' | 'reject' | 'start' | 'complete' | 'cancel',
    extra: { reason?: string; note?: string } = {},
  ) {
    assertProvider(user);
    const r = await this.requests.findOne({ id, provider_account_id: user.id });
    if (!r) throw new NotFoundException('request not found');
    const allowed = PROVIDER_REQUEST_TRANSITIONS[r.status] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`cannot transition from ${r.status} to ${to}`);
    }
    const now = new Date();
    r.timeline.push({ at: now, status: to, by_role: 'provider', by_user_id: user.id, note: extra.note });
    r.provider_action_log.push({ at: now, action, by_user_id: user.id, note: extra.note, reason: extra.reason });
    r.status = to;
    if (to === ProviderRequestStatus.ACCEPTED) {
      r.accepted_at = now;
      if (!r.scheduled_at) r.scheduled_at = now;
    }
    if (to === ProviderRequestStatus.REJECTED) {
      r.rejected_at = now;
      r.rejection_reason = extra.reason || extra.note;
    }
    if (to === ProviderRequestStatus.IN_PROGRESS) r.started_at = now;
    if (to === ProviderRequestStatus.COMPLETED) r.completed_at = now;
    if (to === ProviderRequestStatus.CANCELLED) r.cancelled_at = now;
    await r.save();
    await this.audit.create({
      provider_account_id: user.id,
      actor_id: user.id,
      actor_role: 'provider',
      action: `request.${action}`,
      target: { collection: 'provider_requests', id: r.id },
      after: { status: r.status },
    });
    // Phase 1C hooks
    if (to === ProviderRequestStatus.ACCEPTED) {
      try { await this.assignment.onProviderAccepted(r.id, user.id); } catch (e: any) { this.logger.warn(`assignment.onAccepted failed: ${e?.message}`); }
    } else if (to === ProviderRequestStatus.REJECTED) {
      try { await this.assignment.onProviderRejected(r.id, user.id, extra.reason); } catch (e: any) { this.logger.warn(`assignment.onRejected failed: ${e?.message}`); }
    }
    try { await this.scoring.onLifecycleEvent(user.id); } catch { /* noop */ }
    // Notification (in-app)
    await this.notifs.createSystem(user.id, {
      type: 'request_status' as any,
      title_ar: this.statusTitleAr(to),
      title_en: this.statusTitleEn(to),
      body_ar: r.summary_ar || r.patient?.name,
      body_en: r.summary_en || r.patient?.name,
      related_id: r.id,
      related_type: 'request',
      icon: this.typeIcon(r.type),
    });
    return r.toObject();
  }

  accept(user: any, id: string, body: { note?: string; scheduled_at?: string } = {}) {
    return this.transition(user, id, ProviderRequestStatus.ACCEPTED, 'accept', { note: body.note });
  }
  reject(user: any, id: string, body: { reason?: string; note?: string } = {}) {
    return this.transition(user, id, ProviderRequestStatus.REJECTED, 'reject', { reason: body.reason, note: body.note });
  }
  start(user: any, id: string, body: { note?: string } = {}) {
    return this.transition(user, id, ProviderRequestStatus.IN_PROGRESS, 'start', { note: body.note });
  }
  complete(user: any, id: string, body: { note?: string } = {}) {
    return this.transition(user, id, ProviderRequestStatus.COMPLETED, 'complete', { note: body.note });
  }
  cancel(user: any, id: string, body: { reason?: string; note?: string } = {}) {
    return this.transition(user, id, ProviderRequestStatus.CANCELLED, 'cancel', { reason: body.reason, note: body.note });
  }

  /** Hospital/Clinic assigns a staff member to a request. */
  async assignStaff(user: any, id: string, body: { staff_id: string; notes?: string }) {
    if (!body?.staff_id || typeof body.staff_id !== 'string') throw new BadRequestException('staff_id_required');
    const r: any = await this.requests.findOne({ id });
    if (!r) throw new (await import('@nestjs/common')).NotFoundException('request_not_found');
    const acc = (user as any).provider_account_id || (user as any).id;
    if (r.provider_account_id !== acc && (user as any).role !== 'admin' && (user as any).parent_provider_account_id !== acc) {
      throw new (await import('@nestjs/common')).ForbiddenException('not_owner');
    }
    const staff: any = await this.operators.findOne({
      id: body.staff_id,
      provider_account_id: r.provider_account_id,
      status: 'active',
    });
    if (!staff) throw new ForbiddenException('staff_not_in_active_facility_roster');
    const now = new Date();
    const previousStaffId = r.assigned_staff_id || null;
    r.assigned_staff_id = staff.id;
    r.assigned_staff_name = staff.full_name || staff.email || undefined;
    r.assigned_at = now;
    r.assignment_roster_id = staff.id;
    if (body.notes) r.assignment_notes = String(body.notes).slice(0, 1000);
    await r.save();
    await this.audit.create({
      provider_account_id: r.provider_account_id,
      actor_id: user.id,
      actor_role: user.role || 'provider',
      action: 'request.staff_assigned',
      target: { collection: 'provider_requests', id: r.id },
      before: { assigned_staff_id: previousStaffId },
      after: { assigned_staff_id: staff.id, assignment_roster_id: staff.id },
    });
    return r.toObject();
  }

  // ---------- INTERNAL CREATE (called by seed or other modules) ----------
  async createInternal(input: {
    provider_account_id: string;
    type: ProviderRequestType;
    patient: any;
    payload: any;
    summary_ar?: string;
    summary_en?: string;
    amount_total?: number;
    priority?: ProviderRequestPriority;
    scheduled_at?: Date;
    seeded?: boolean;
  }) {
    const now = new Date();
    const r = await this.requests.create({
      provider_account_id: input.provider_account_id,
      type: input.type,
      status: ProviderRequestStatus.PENDING,
      priority: input.priority || ProviderRequestPriority.NORMAL,
      patient: input.patient,
      payload: input.payload,
      summary_ar: input.summary_ar,
      summary_en: input.summary_en,
      amount_total: input.amount_total || 0,
      scheduled_at: input.scheduled_at,
      seeded: !!input.seeded,
      timeline: [{ at: now, status: ProviderRequestStatus.PENDING, by_role: 'system', by_user_id: 'seed', note: 'request created' }],
    });
    await this.notifs.createSystem(input.provider_account_id, {
      type: 'new_request' as any,
      title_ar: 'طلب جديد بانتظار قبولك',
      title_en: 'New request awaiting your acceptance',
      body_ar: input.summary_ar,
      body_en: input.summary_en,
      related_id: r.id,
      related_type: 'request',
      icon: this.typeIcon(input.type),
    });

    const createdReq = r.toObject();
    // End-To-End: Broadcast to DoctorDashboard
    this.events.emit('chat.broadcast', {
      room: `provider_${input.provider_account_id}`,
      event: 'new_consultation_request',
      payload: {
        id: createdReq.id,
        patient_name: input.patient?.name || 'مريض',
        service_type: input.type,
        total: input.amount_total || 0,
        scheduled_at: input.scheduled_at,
        urgent: input.priority === 'urgent'
      }
    });

    return createdReq;
  }

  // ---------- HELPERS ----------
  private statusTitleAr(s: ProviderRequestStatus) {
    const m: Record<string, string> = {
      accepted: 'تم قبول الطلب', rejected: 'تم رفض الطلب', in_progress: 'الطلب قيد التنفيذ',
      completed: 'تم إنجاز الطلب', cancelled: 'تم إلغاء الطلب', pending: 'طلب جديد',
    };
    return m[s] || s;
  }
  private statusTitleEn(s: ProviderRequestStatus) {
    const m: Record<string, string> = {
      accepted: 'Request accepted', rejected: 'Request rejected', in_progress: 'Request in progress',
      completed: 'Request completed', cancelled: 'Request cancelled', pending: 'New request',
    };
    return m[s] || s;
  }
  private typeIcon(t: ProviderRequestType) {
    const m: Record<string, string> = { pharmacy: 'pill', lab: 'flask', radiology: 'scan', doctor: 'stethoscope', home_care: 'home' };
    return m[t] || 'bell';
  }
}
