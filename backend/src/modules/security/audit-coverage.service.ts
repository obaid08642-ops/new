/**
 * Phase 23.2 — the events the audit trail must cover.
 *
 * The chain (`AuditService`) used to receive only the events somebody remembered to write, and several of its handlers
 * listened for names nothing emits (`auth.login`, `booking.created`, ...). This service closes the gap in two ways:
 *
 *  1. Every order and booking event already passes through one funnel (`WorkflowEngineService` → `service.*`, the pharmacy
 *     bus → `pharmacy.*`, the admin writer → `admin.*`). One subscriber turns those into chain rows with the actor, the
 *     entity, the before/after state, the reason and the request's origin — so a new transition is covered without a new line.
 *  2. The remaining events (sign-up, sign-in, OTP, password, sessions, consent, data export/erasure, prescriptions) are
 *     emitted by their own services under `auth.*`, `legal.*`, `pdpl.*` and handled here.
 *
 * The origin (ip, device, agent, platform, app version) and the request id are filled by `AuditService.write` from the
 * request context, so no handler here has to pass them.
 */
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from './security.module';
import { redactAuditValue } from '../../common/audit-log.interceptor';

/** Event families that carry a bus-shaped payload (`type`, `entity_type`, `entity_id`, actor, before/after, meta). */
const BUS_FAMILIES = /^(service\.|pharmacy\.|admin\.|insurance\.pending|catalog\.|onboarding\.|substitute\.|allocation|home_visit\.|booking\.document_uploaded|provider\.submitted_for_review)/;

/** Actions that are an end or a refusal: worth a second look in a review. */
const WARN_ACTIONS = /(cancel|reject|rollback|released|expired|refund|delete|force)/i;

export interface BusShapedEvent {
  type: string;
  entity_type: string;
  entity_id: string;
  actor_account_id?: string;
  actor_role?: string;
  reason_code?: string;
  patient_account_id?: string;
  pharmacy_account_id?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  meta?: Record<string, unknown> & { from_domain?: string; to_domain?: string; kind?: string };
}

export function isBusShaped(p: unknown): p is BusShapedEvent {
  const e = p as Partial<BusShapedEvent> | null;
  return !!e && typeof e.type === 'string' && typeof e.entity_type === 'string' && e.entity_id !== undefined && e.entity_id !== null && BUS_FAMILIES.test(e.type);
}

@Injectable()
export class AuditCoverageService {
  // forwardRef: security.module.ts imports this file for its providers list and this file needs AuditService back
  constructor(@Inject(forwardRef(() => AuditService)) private readonly audit: AuditService) {}

  /** Every bus-shaped event of the order/booking/admin families becomes one chain row. */
  @OnEvent('**')
  async onAnyEvent(p: unknown): Promise<void> {
    if (!isBusShaped(p)) return;
    const meta = redactAuditValue(p.meta ?? {}) as Record<string, any>;
    // a state change carries the domain states: show them as the before/after the plan asks for
    const changes = p.before || p.after
      ? { before: redactAuditValue(p.before) as Record<string, any>, after: redactAuditValue(p.after) as Record<string, any> }
      : meta.from_domain || meta.to_domain
        ? { before: { state: meta.from_domain }, after: { state: meta.to_domain } }
        : undefined;
    await this.audit.write({
      action: p.type,
      user_id: p.actor_account_id,
      role: p.actor_role,
      resource_kind: p.entity_type,
      resource_id: String(p.entity_id),
      changes,
      reason: p.reason_code,
      severity: p.type.startsWith('admin.') || WARN_ACTIONS.test(p.type) ? 'warn' : 'info',
      details: {
        ...(p.patient_account_id ? { patient_id: p.patient_account_id } : {}),
        ...(p.pharmacy_account_id ? { pharmacy_id: p.pharmacy_account_id } : {}),
        ...(meta.kind ? { kind: meta.kind } : {}),
        ...(meta.order_id ? { order_id: String(meta.order_id) } : {}),
        ...(meta.booking_id ? { booking_id: String(meta.booking_id) } : {}),
      },
    });
  }

  /** Radiology bookings announce their steps under their own names (booking id, no actor): the caller is the actor. */
  @OnEvent('radiology.state_changed') async onRadiologyState(p: any) {
    await this.audit.write({ action: 'radiology.state_changed', resource_kind: 'radiology_booking', resource_id: p?.bookingId, details: { state: p?.state, patient_id: p?.patientId, booking_id: p?.bookingId } });
  }
  @OnEvent('radiology.scan_aborted') async onRadiologyAborted(p: any) {
    await this.audit.write({ action: 'radiology.scan_aborted', resource_kind: 'radiology_booking', resource_id: p?.bookingId, reason: p?.reason, severity: 'warn', details: { patient_id: p?.patientId, booking_id: p?.bookingId } });
  }

  /* ---- account and session events (emitted by AuthService) ---- */

  @OnEvent('user.registered') async onRegistered(p: any) {
    await this.audit.write({ action: 'account_registered', user_id: p?.user_id, role: p?.role, resource_kind: 'user', resource_id: p?.user_id });
  }
  @OnEvent('user.logged_in') async onLoggedIn(p: any) {
    await this.audit.write({ action: 'login_success', user_id: p?.user_id, role: p?.role, details: { method: p?.method ?? 'password' } });
  }
  @OnEvent('user.guest_converted') async onGuestConverted(p: any) {
    await this.audit.write({ action: 'guest_converted', user_id: p?.user_id, resource_kind: 'user', resource_id: p?.user_id });
  }

  @OnEvent('auth.otp_requested') async onOtpRequested(p: any) {
    await this.audit.write({ action: 'otp_requested', user_id: p?.user_id, details: { purpose: p?.purpose, channel: p?.channel, who: p?.who } });
  }
  @OnEvent('auth.password_changed') async onPasswordChanged(p: any) {
    await this.audit.write({ action: 'password_changed', user_id: p?.user_id, role: p?.role, severity: 'warn', details: { how: p?.how } });
  }
  @OnEvent('auth.session_ended') async onSessionEnded(p: any) {
    await this.audit.write({ action: 'session_ended', user_id: p?.user_id, role: p?.role, details: { scope: p?.scope, sessions: p?.sessions } });
  }
  @OnEvent('auth.device_changed') async onDeviceChanged(p: any) {
    await this.audit.write({ action: `device_${p?.change || 'changed'}`, user_id: p?.user_id, role: p?.role, severity: 'warn', details: { device: p?.device_label } });
  }

  /* ---- consent ---- (data export/erasure and policy acceptance by the patient are recorded by their services) */

  @OnEvent('legal.accepted') async onLegalAccepted(p: any) {
    await this.audit.write({ action: 'policy_accepted', user_id: p?.user_id, role: p?.role, resource_kind: 'legal_policy', resource_id: p?.policy_key, details: { version: p?.version } });
  }
}
