import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createHash } from 'crypto';
import { PharmacyOrderService } from '../pharmacy/services/pharmacy-order.service';
import { PharmacyOfferService } from '../pharmacy/services/pharmacy-offer.service';
import { catalogueFlags } from '../pharmacy/services/rx-rules';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';
import { CareService } from '../care/care.service';
import { AppointmentsService } from '../care/appointments.service';
import { SlotLocksService } from '../slot-locks/slot-locks.module';
import { LabsService } from '../labs/labs.service';
import { HomeCareSvc } from '../home-care/home-care.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { issuer } from '../agent-oauth/agent-oauth.constants';
import type { AgentPrincipal } from '../agent-oauth/agent-oauth.service';
import type { ServiceType } from '../../schemas/appointment.schema';

/**
 * AC-3 (docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md): authenticated MCP tools for AI
 * assistants. Every tool reuses the existing service the apps use — no copies of booking
 * or order logic. Rules for every write tool: it requires an `idempotency_key`, it writes
 * an audit entry with `actor_type: 'agent'` and the client id, and it is rate-limited per
 * client and per patient (AC-6 numbers: 30/min; writes 10/hour per patient).
 *
 * What an agent can NEVER do (owner rules, binding): bypass a prescription (any Rx or
 * controlled line refuses the whole request before anything is created), select an offer,
 * or complete a payment. The patient confirms and pays on Nabd Plus pages (Moyasar);
 * the agent only prepares holds/requests and returns the page URLs.
 */

export const AGENT_WRITE_TOOLS = new Set([
  'create_pharmacy_request',
  'hold_consultation',
  'hold_lab',
  'hold_nursing',
  'cancel_hold',
]);

const MIN_PER_CLIENT_CALLS = 30;
const HOURLY_WRITE_CALLS_PER_PATIENT = 10;

const trimSlash = (s: string) => s.replace(/\/+$/, '');
const site = () => trimSlash(process.env.NABD_PUBLIC_URL || issuer() || 'https://nabd.plus');
/** Patient-web links open real pages in the patient's locale (default ar); never a session or token. */
const web = (path: string, locale = 'ar') => `${site()}/${locale}${path.startsWith('/') ? path : `/${path}`}`;

const iso = (v: unknown): string | null => {
  const d = v instanceof Date ? v : new Date(String(v ?? ''));
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const argsHash = (args: Record<string, unknown>) =>
  createHash('sha256').update(JSON.stringify(args ?? {})).digest('hex');

function toolError(id: unknown, errorCode: string, message: string, extra: Record<string, unknown> = {}) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code: -32000, message, data: { error_code: errorCode, ...extra } } };
}

function toolOk(id: unknown, payload: Record<string, unknown>) {
  const text = JSON.stringify(payload);
  return { jsonrpc: '2.0', id: id ?? null, result: { content: [{ type: 'text', text }], structuredContent: payload } };
}

@Injectable()
export class AgentToolsService {
  private readonly logger = new Logger(AgentToolsService.name);

  constructor(
    private readonly pharmacyOrders: PharmacyOrderService,
    private readonly pharmacyOffers: PharmacyOfferService,
    private readonly care: CareService,
    private readonly appts: AppointmentsService,
    private readonly locks: SlotLocksService,
    private readonly labs: LabsService,
    private readonly nursing: HomeCareSvc,
    private readonly users: UsersService,
    private readonly redis: RedisService,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  // ── entry point (called by McpController after auth; consultation_slots is public) ──

  async dispatch(tool: string, args: Record<string, unknown>, principal: AgentPrincipal, id: unknown) {
    const requestId = `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      await this.checkRateLimit(tool, principal);
      const payload = await this.run(tool, args, principal, requestId);
      await this.audit(requestId, tool, principal, true, null, payload);
      return toolOk(id, payload);
    } catch (e: unknown) {
      const { errorCode, message, extra, status } = this.toToolError(e);
      await this.audit(requestId, tool, principal, false, errorCode, args);
      void status;
      const thrownExtra = (e as { extra?: Record<string, unknown> })?.extra;
      return toolError(id, errorCode, message, { ...extra, ...(thrownExtra ?? {}), request_id: requestId });
    }
  }

  /** consultation_slots is public (the one availability function, real slots only). */
  async dispatchPublic(tool: string, args: Record<string, unknown>, id: unknown) {
    if (tool !== 'consultation_slots') {
      return toolError(id, 'AUTHENTICATION_REQUIRED', 'authentication_required', {});
    }
    try {
      return toolOk(id, await this.consultationSlots(args));
    } catch (e: unknown) {
      const { errorCode, message, extra } = this.toToolError(e);
      return toolError(id, errorCode, message, extra);
    }
  }

  // ── cross-cutting: rate limit, idempotency, audit ──

  private redisClient(): { incr(k: string): Promise<number>; expire(k: string, s: number): Promise<unknown> } | null {
    try {
      const c = this.redis?.getClient?.() as unknown as {
        incr(k: string): Promise<number>; expire(k: string, s: number): Promise<unknown>;
      } | null;
      return c ?? null;
    } catch {
      return null;
    }
  }

  /** AC-6 numbers, enforced per client+patient (reads) and per patient (writes). Best-effort: a Redis outage never blocks care. */
  private async checkRateLimit(tool: string, principal: AgentPrincipal) {
    const client = this.redisClient();
    if (!client) return;
    try {
      const minKey = `agentrl:min:${principal.client_id}:${principal.patient_id}`;
      const minute = await client.incr(minKey);
      if (minute === 1) await client.expire(minKey, 60);
      if (minute > MIN_PER_CLIENT_CALLS) {
        const err = new Error('rate_limited_minute') as Error & { errorCode?: string };
        err.errorCode = 'RATE_LIMITED';
        throw err;
      }
      if (AGENT_WRITE_TOOLS.has(tool)) {
        const hourKey = `agentrl:hour:write:${principal.patient_id}`;
        const hour = await client.incr(hourKey);
        if (hour === 1) await client.expire(hourKey, 3600);
        if (hour > HOURLY_WRITE_CALLS_PER_PATIENT) {
          const err = new Error('rate_limited_hour') as Error & { errorCode?: string };
          err.errorCode = 'RATE_LIMITED';
          throw err;
        }
      }
    } catch (e: unknown) {
      if ((e as { errorCode?: string })?.errorCode === 'RATE_LIMITED') throw e;
      this.logger.warn(`agent rate limiter skipped: ${String((e as Error)?.message || e)}`);
    }
  }

  private idemKey(patientId: string, clientId: string, tool: string, key: string) {
    return { patient_id: patientId, client_id: clientId, tool, key };
  }

  /** Replay-safe: the same key returns the stored answer and creates nothing twice. A reused key with different args is refused. */
  private async idempotent<T>(
    tool: string, args: Record<string, unknown>, principal: AgentPrincipal, run: () => Promise<T>,
  ): Promise<{ replayed: boolean; value: T }> {
    const key = args.idempotency_key;
    if (typeof key !== 'string' || !key.trim() || key.length > 128) {
      const err = new Error('idempotency_key_required') as Error & { errorCode?: string };
      err.errorCode = 'IDEMPOTENCY_KEY_REQUIRED';
      throw err;
    }
    const col = this.conn.collection('agent_idempotency_keys');
    const filter = this.idemKey(principal.patient_id, principal.client_id, tool, key.trim());
    const existing = await col.findOne(filter);
    if (existing) {
      if (existing.args_hash !== argsHash(args)) {
        const err = new Error('idempotency_key_reused_with_different_request') as Error & { errorCode?: string };
        err.errorCode = 'IDEMPOTENCY_KEY_REUSED';
        throw err;
      }
      return { replayed: true, value: existing.response as T };
    }
    const value = await run();
    try {
      await col.insertOne({ ...filter, args_hash: argsHash(args), response: value, createdAt: new Date() });
    } catch (e: unknown) {
      // Lost the race with an identical call: return the winner's answer.
      if ((e as { code?: number })?.code === 11000) {
        const winner = await col.findOne(filter);
        if (winner) return { replayed: true, value: winner.response as T };
      }
      throw e;
    }
    return { replayed: false, value };
  }

  /** Every agent call leaves an audit entry with actor_type 'agent' and the client id (case 10; AC-6 admin view reads these). */
  private async audit(
    requestId: string, tool: string, principal: AgentPrincipal, ok: boolean,
    errorCode: string | null, ref: unknown,
  ) {
    try {
      let refText = '';
      try {
        refText = JSON.stringify(ref ?? '').slice(0, 2000);
      } catch {
        refText = '';
      }
      await this.conn.collection('mcp_audit_log').insertOne({
        id: requestId, tool, ok, error_code: errorCode, at: new Date(),
        actor_type: 'agent', client_id: principal.client_id, patient_id: principal.patient_id,
        scopes: principal.scopes, ref: refText,
      });
    } catch {
      /* audit must never break tool execution */
    }
  }

  private toToolError(e: unknown): { errorCode: string; message: string; extra: Record<string, unknown>; status?: number } {
    const err = e as { errorCode?: string; code?: string; message?: string; status?: number; response?: unknown };
    if (err?.errorCode) return { errorCode: String(err.errorCode), message: String(err.message || err.errorCode), extra: {} };
    const msg = String(err?.message || 'tool_failed');
    const status = typeof err?.status === 'number' ? err.status : undefined;
    const codeOf = (fallback: string) =>
      msg.split(':')[0].trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 64) || fallback;
    if (status === 404 || /not_found|not found/i.test(msg)) return { errorCode: codeOf('NOT_FOUND'), message: msg, extra: {}, status };
    if (status === 409 || /slot_taken|slot_already_booked|conflict/i.test(msg)) {
      return { errorCode: /slot/i.test(msg) ? 'SLOT_TAKEN' : 'CONFLICT', message: msg, extra: {}, status };
    }
    if (status === 403 || /forbidden|not_yours|insufficient/i.test(msg)) {
      return { errorCode: 'FORBIDDEN', message: msg, extra: {}, status };
    }
    if (status === 400 || /required|invalid|expired|not_supported|not_allowed|not_orderable|mismatch/i.test(msg)) {
      return { errorCode: codeOf('BAD_REQUEST'), message: msg, extra: {}, status };
    }
    return { errorCode: 'TOOL_FAILED', message: msg, extra: {}, status };
  }

  // ── dispatch ──

  private agentUser(principal: AgentPrincipal) {
    return { id: principal.patient_id, role: 'patient' as const };
  }

  private async run(tool: string, args: Record<string, unknown>, principal: AgentPrincipal, requestId: string) {
    void requestId;
    const user = this.agentUser(principal);
    switch (tool) {
      case 'my_orders':
        return this.myOrders(user);
      case 'my_bookings':
        return this.myBookings(user);
      case 'consultation_slots':
        return this.consultationSlots(args);
      case 'create_pharmacy_request':
        return (await this.idempotent(tool, args, principal, () => this.createPharmacyRequest(user, args))).value;
      case 'list_offers':
        return this.listOffers(user, args);
      case 'choose_offer_link':
        return this.chooseOfferLink(user, args);
      case 'hold_consultation':
        return (await this.idempotent(tool, args, principal, () => this.holdConsultation(user, principal, args))).value;
      case 'hold_lab':
        return (await this.idempotent(tool, args, principal, () => this.holdLab(user, principal, args))).value;
      case 'hold_nursing':
        return (await this.idempotent(tool, args, principal, () => this.holdNursing(user, principal, args))).value;
      case 'cancel_hold':
        return (await this.idempotent(tool, args, principal, () => this.cancelHold(user, principal, args))).value;
      default: {
        const err = new Error(`unknown_tool_${tool}`) as Error & { errorCode?: string };
        err.errorCode = 'UNKNOWN_TOOL';
        throw err;
      }
    }
  }

  // ── reads ──

  /** The patient's own orders with status codes and a deep link each; no other patient data. */
  private async myOrders(user: { id: string; role: 'patient' }) {
    const orders = await this.pharmacyOrders.list(user);
    return {
      orders: (Array.isArray(orders) ? orders : []).map((o: Record<string, unknown>) => ({
        order_id: String(o.id),
        status: String(o.status ?? ''),
        items_count: Array.isArray(o.items) ? o.items.length : 0,
        total: (o.totals as Record<string, unknown> | undefined)?.total ?? null,
        currency: (o.totals as Record<string, unknown> | undefined)?.currency ?? 'SAR',
        tracking_url: web(`/pharmacy/broadcast-status?orderId=${encodeURIComponent(String(o.id))}`),
        created_at: o.createdAt ?? o.created_at ?? null,
      })),
    };
  }

  private async myBookings(user: { id: string; role: 'patient' }) {
    const appts = await this.appts.listMine(user);
    const rows = (Array.isArray(appts) ? appts : []).map((a: Record<string, unknown>) => {
      const pending = String(a.status) === 'PENDING' && String(a.payment_status ?? '') !== 'paid';
      return {
        booking_id: String(a.id),
        status: String(a.status ?? ''),
        service_type: String(a.service_type ?? ''),
        doctor_id: a.doctor_id != null ? String(a.doctor_id) : null,
        slot_start: iso(a.slot_start),
        payment_url: pending ? web(`/consultations/booking-status?appointmentId=${encodeURIComponent(String(a.id))}`) : null,
      };
    });
    return { bookings: rows };
  }

  /** Public: the one availability function (#306). Real slots only — never invented. */
  private async consultationSlots(args: Record<string, unknown>) {
    const doctorId = typeof args.doctor_id === 'string' ? args.doctor_id.trim() : '';
    const date = typeof args.date === 'string' ? args.date.trim() : '';
    const mode = typeof args.mode === 'string' ? args.mode.trim() : '';
    if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['clinic', 'video', 'home'].includes(mode)) {
      const err = new Error('doctor_id, date (YYYY-MM-DD) and mode (clinic|video|home) are required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_PARAMS';
      throw err;
    }
    const slots = await this.care.doctorSlots(doctorId, date, mode as 'clinic' | 'video' | 'home');
    return { doctor_id: doctorId, date, mode, ...(slots && typeof slots === 'object' ? slots : { slots }) };
  }

  // ── pharmacy writes ──

  private rxRefusal() {
    const err = new Error('RX_VERIFICATION_REQUIRED') as Error & { errorCode?: string; extra?: Record<string, unknown> };
    err.errorCode = 'RX_VERIFICATION_REQUIRED';
    err.extra = {
      upload_url: web('/pharmacy/scan-prescription'),
      consult_url: web('/consultations/specialties'),
    };
    return err;
  }

  private async createPharmacyRequest(user: { id: string; role: 'patient' }, args: Record<string, unknown>) {
    const items = Array.isArray(args.items) ? args.items : [];
    if (!items.length || items.length > 50) {
      const err = new Error('items_required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_ITEMS';
      throw err;
    }
    const lines = items.map((it: unknown) => {
      const row = (it ?? {}) as Record<string, unknown>;
      const qty = Math.max(1, Math.floor(Number(row.qty) || 1));
      return { medicine_id: typeof row.medicine_id === 'string' ? row.medicine_id.trim() : '', qty };
    });
    if (lines.some((l) => !l.medicine_id)) {
      const err = new Error('medicine_id_required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_ITEMS';
      throw err;
    }
    // Owner rule: a prescription (Rx) or controlled item is refused to an agent, whole request,
    // BEFORE anything is created. Only OTC lines can be ordered.
    const meds = await this.conn.collection(CATALOG_COLLECTIONS.medicines)
      .find({ id: { $in: [...new Set(lines.map((l) => l.medicine_id))] } },
        { projection: { _id: 0, id: 1, sku: 1, name_ar: 1, name_en: 1, price: 1, requires_prescription: 1, controlled: 1 } })
      .toArray();
    const byId = new Map(meds.map((m: Record<string, unknown>) => [String(m.id), m]));
    for (const line of lines) {
      if (!byId.has(line.medicine_id)) {
        const err = new Error(`medicine_not_found:${line.medicine_id}`) as Error & { errorCode?: string };
        err.errorCode = 'MEDICINE_NOT_FOUND';
        throw err;
      }
    }
    const flags = await catalogueFlags(this.conn, lines);
    if (flags.some((f) => f.requires_prescription || f.controlled)) throw this.rxRefusal();

    const addressId = typeof args.address_id === 'string' ? args.address_id.trim() : '';
    const profile = await this.users.getPatientProfile(user.id);
    const saved = Array.isArray(profile?.addresses) ? profile.addresses : [];
    const chosen = addressId ? saved.find((a: { id?: string }) => a?.id === addressId) : (saved.find((a: { is_default?: boolean }) => a?.is_default) ?? saved[0]);
    if (addressId && !chosen) {
      const err = new Error('address_not_found') as Error & { errorCode?: string };
      err.errorCode = 'ADDRESS_NOT_FOUND';
      throw err;
    }
    const deliveryAddress = chosen
      ? { label: chosen.label, street: chosen.street ?? chosen.line1, city: chosen.city, district: chosen.district, lat: chosen.lat, lng: chosen.lng, geo: chosen.geo, phone: chosen.phone }
      : {};

    // Through the existing order service: create + submit (submit runs the D-10 Rx rules
    // again and starts the pharmacy broadcast — the request the patient sees and picks from).
    const created = await this.pharmacyOrders.create(user, {
      items: lines.map((l) => {
        const m = byId.get(l.medicine_id) as Record<string, unknown>;
        return { medicine_id: l.medicine_id, qty: l.qty, name_ar: m.name_ar, name_en: m.name_en, sku: m.sku };
      }),
      delivery_address: deliveryAddress,
      fulfillment: 'delivery',
    });
    const submitted = await this.pharmacyOrders.submit(user, String(created.id));
    const orderId = String(submitted?.id ?? created.id);
    return {
      order_id: orderId,
      status: String(submitted?.status ?? created.status ?? ''),
      tracking_url: web(`/pharmacy/broadcast-status?orderId=${encodeURIComponent(orderId)}`),
    };
  }

  private async listOffers(user: { id: string; role: 'patient' }, args: Record<string, unknown>) {
    const orderId = typeof args.order_id === 'string' ? args.order_id.trim() : '';
    if (!orderId) {
      const err = new Error('order_id_required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_PARAMS';
      throw err;
    }
    const includeClosed = args.include_closed === true;
    // Live offers through the existing offer service; a foreign order reads as not found.
    const offers = await this.pharmacyOffers.listForPatient(user, orderId, includeClosed);
    return { order_id: orderId, offers: Array.isArray(offers) ? offers : [] };
  }

  /** Selects nothing: returns the patient's offer page URL, where the patient selects and pays. */
  private async chooseOfferLink(user: { id: string; role: 'patient' }, args: Record<string, unknown>) {
    const orderId = typeof args.order_id === 'string' ? args.order_id.trim() : '';
    const offerId = typeof args.offer_id === 'string' ? args.offer_id.trim() : '';
    if (!orderId || !offerId) {
      const err = new Error('order_id and offer_id are required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_PARAMS';
      throw err;
    }
    const offers = await this.pharmacyOffers.listForPatient(user, orderId, true);
    const found = (Array.isArray(offers) ? offers : []).find((o: Record<string, unknown>) => String(o.id) === offerId);
    if (!found) {
      const err = new Error('offer_not_found') as Error & { errorCode?: string };
      err.errorCode = 'OFFER_NOT_FOUND';
      throw err;
    }
    return { url: web(`/pharmacy/broadcast-status?orderId=${encodeURIComponent(orderId)}`) };
  }

  // ── booking holds ──

  private async recordHold(principal: AgentPrincipal, hold: {
    booking_id: string; kind: 'consultation' | 'lab' | 'nursing'; provider_id?: string; slot_start?: string; lock_id?: string; expires_at?: Date | null;
  }) {
    await this.conn.collection('agent_holds').insertOne({
      ...hold, patient_id: principal.patient_id, client_id: principal.client_id, createdAt: new Date(),
    });
  }

  private async holdConsultation(
    user: { id: string; role: 'patient' }, principal: AgentPrincipal, args: Record<string, unknown>,
  ) {
    const doctorId = typeof args.doctor_id === 'string' ? args.doctor_id.trim() : '';
    const slot = typeof args.slot === 'string' ? args.slot.trim() : '';
    const mode = typeof args.mode === 'string' ? args.mode.trim() : '';
    if (!doctorId || !slot || !['clinic', 'video', 'home'].includes(mode)) {
      const err = new Error('doctor_id, slot (ISO) and mode (clinic|video|home) are required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_PARAMS';
      throw err;
    }
    const slotIso = iso(slot);
    if (!slotIso) {
      const err = new Error('slot_not_a_valid_datetime') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_SLOT';
      throw err;
    }
    // A slot that is not real is refused and nothing is created.
    const day = slotIso.slice(0, 10);
    const live = await this.care.doctorSlots(doctorId, day, mode as 'clinic' | 'video' | 'home');
    const liveSlots: Array<Record<string, unknown>> = Array.isArray((live as Record<string, unknown>)?.slots)
      ? (live as { slots: Array<Record<string, unknown>> }).slots : [];
    const real = liveSlots.find((s) => iso(s.start) === slotIso && s.available !== false);
    if (!real) {
      const err = new Error('slot_not_available') as Error & { errorCode?: string };
      err.errorCode = 'SLOT_NOT_AVAILABLE';
      throw err;
    }
    // The normal hold: the patient's own 10-minute slot lock for that slot.
    let lock: Record<string, unknown>;
    try {
      lock = await this.locks.reserve(user, { provider_id: doctorId, booking_kind: 'consultation', slot_start: slotIso }) as Record<string, unknown>;
    } catch (e: unknown) {
      const err = new Error('slot_taken') as Error & { errorCode?: string };
      err.errorCode = 'SLOT_TAKEN';
      (err as { status?: number }).status = 409;
      void e;
      throw err;
    }
    // Through the existing booking service as a pending booking. Card stays PENDING
    // until the patient pays on Nabd Plus; cash/insurance would auto-confirm, so an
    // agent hold is always card.
    let appt: Record<string, unknown>;
    try {
      appt = await this.appts.create(user, {
        doctor_id: doctorId, service_type: mode as ServiceType, slot_start: slotIso, payment_method: 'card',
      }) as Record<string, unknown>;
    } catch (e: unknown) {
      await this.locks.releaseQuietly(user, String(lock.id ?? lock._id ?? '')).catch(() => null);
      throw e;
    }
    const bookingId = String(appt.id);
    const expiresAt = iso(lock.expires_at) ?? new Date(Date.now() + 10 * 60_000).toISOString();
    await this.recordHold(principal, {
      booking_id: bookingId, kind: 'consultation', provider_id: doctorId, slot_start: slotIso,
      lock_id: String(lock.id ?? ''), expires_at: lock.expires_at ? new Date(String(lock.expires_at)) : null,
    });
    return {
      booking_id: bookingId,
      expires_at: expiresAt,
      payment_url: web(`/consultations/booking-status?appointmentId=${encodeURIComponent(bookingId)}`),
    };
  }

  private async holdLab(user: { id: string; role: 'patient' }, principal: AgentPrincipal, args: Record<string, unknown>) {
    const items = Array.isArray(args.items) ? args.items : [];
    const serviceIds = items.map((it: unknown) => (it as Record<string, unknown>)?.service_id).filter((s): s is string => typeof s === 'string' && !!s);
    const single = typeof args.service_id === 'string' ? [args.service_id] : [];
    const ids = [...serviceIds, ...single];
    const scheduledAt = typeof args.scheduled_at === 'string' ? args.scheduled_at : '';
    if (!ids.length || !scheduledAt) {
      const err = new Error('service_id(s) and scheduled_at are required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_PARAMS';
      throw err;
    }
    // Same pattern through the lab booking service with its real slot engine (capacity +
    // collision checks inside book). Card stays unpaid until the patient pays on Nabd Plus.
    const booking = await this.labs.book(user, {
      items: ids.map((service_id) => ({ service_id })),
      scheduled_at: scheduledAt,
      provider_account_id: typeof args.provider_account_id === 'string' ? args.provider_account_id : undefined,
      location_type: typeof args.location_type === 'string' ? args.location_type : undefined,
      payment_method: 'card',
    }) as Record<string, unknown>;
    const bookingId = String(booking.id);
    await this.recordHold(principal, { booking_id: bookingId, kind: 'lab' });
    return {
      booking_id: bookingId,
      scheduled_at: iso(booking.scheduled_at) ?? scheduledAt,
      payment_url: web(`/diagnostics/bookings/labs/${encodeURIComponent(bookingId)}`),
    };
  }

  private async holdNursing(user: { id: string; role: 'patient' }, principal: AgentPrincipal, args: Record<string, unknown>) {
    const serviceId = typeof args.service_id === 'string' ? args.service_id.trim() : '';
    const scheduledAt = typeof args.scheduled_at === 'string' ? args.scheduled_at : '';
    if (!serviceId || !scheduledAt) {
      const err = new Error('service_id and scheduled_at are required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_PARAMS';
      throw err;
    }
    // Same pattern through the nursing booking service (approved catalogue + nurse checks inside).
    const booking = await this.nursing.book(user, {
      service_id: serviceId,
      scheduled_at: scheduledAt,
      provider_id: typeof args.provider_id === 'string' ? args.provider_id : undefined,
      payment_method: 'card',
      address: typeof args.address === 'object' ? args.address : undefined,
      notes: typeof args.notes === 'string' ? args.notes : undefined,
    }) as Record<string, unknown>;
    const bookingId = String(booking.id);
    await this.recordHold(principal, { booking_id: bookingId, kind: 'nursing' });
    return {
      booking_id: bookingId,
      scheduled_at: iso(booking.scheduled_at) ?? scheduledAt,
      payment_url: web(`/nursing/visits/${encodeURIComponent(bookingId)}`),
    };
  }

  /** Only an unpaid hold the same client created. Paid, foreign, or other-client holds are refused. */
  private async cancelHold(user: { id: string; role: 'patient' }, principal: AgentPrincipal, args: Record<string, unknown>) {
    const bookingId = typeof args.booking_id === 'string' ? args.booking_id.trim() : '';
    if (!bookingId) {
      const err = new Error('booking_id_required') as Error & { errorCode?: string };
      err.errorCode = 'INVALID_PARAMS';
      throw err;
    }
    const hold = await this.conn.collection('agent_holds').findOne({ booking_id: bookingId, client_id: principal.client_id });
    if (!hold || hold.cancelled) {
      const err = new Error('cancel_not_allowed') as Error & { errorCode?: string };
      err.errorCode = 'CANCEL_NOT_ALLOWED';
      throw err;
    }
    if (hold.kind === 'consultation') {
      const appt = await this.conn.collection('appointments').findOne({ id: bookingId });
      if (!appt || String(appt.patient_id) !== user.id || String(appt.status) !== 'PENDING' || String(appt.payment_status ?? '') === 'paid') {
        const err = new Error('cancel_not_allowed') as Error & { errorCode?: string };
        err.errorCode = 'CANCEL_NOT_ALLOWED';
        throw err;
      }
      await this.appts.cancel(bookingId, user, 'agent_cancel_hold');
      if (hold.lock_id) await this.locks.releaseQuietly(user, String(hold.lock_id));
      await this.conn.collection('agent_holds').updateOne({ _id: hold._id }, { $set: { cancelled: true, cancelledAt: new Date() } });
      return { booking_id: bookingId, status: 'CANCELLED' };
    }
    if (hold.kind === 'lab') {
      // Unpaid hold only: the lab pipeline before payment, and never a paid booking.
      const booking = await this.labs.getBooking(bookingId, user) as Record<string, unknown>;
      if (String(booking.payment_status ?? '') === 'paid'
        || !['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(String(booking.state))) {
        const err = new Error('cancel_not_allowed') as Error & { errorCode?: string };
        err.errorCode = 'CANCEL_NOT_ALLOWED';
        throw err;
      }
      await this.labs.cancel(bookingId, user);
      await this.conn.collection('agent_holds').updateOne({ _id: hold._id }, { $set: { cancelled: true, cancelledAt: new Date() } });
      return { booking_id: bookingId, status: 'CANCELLED' };
    }
    if (hold.kind === 'nursing') {
      // Unpaid hold only: requested/assigned pipeline, never a paid or finished visit.
      const booking = await this.nursing.getBooking(bookingId, user) as Record<string, unknown>;
      if (String(booking.payment_status ?? '') === 'paid'
        || !['NEW_REQUEST', 'PROVIDER_ASSIGNED', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(String(booking.state))) {
        const err = new Error('cancel_not_allowed') as Error & { errorCode?: string };
        err.errorCode = 'CANCEL_NOT_ALLOWED';
        throw err;
      }
      await this.nursing.cancel(bookingId, user);
      await this.conn.collection('agent_holds').updateOne({ _id: hold._id }, { $set: { cancelled: true, cancelledAt: new Date() } });
      return { booking_id: bookingId, status: 'CANCELLED' };
    }
    const err = new Error('cancel_not_allowed') as Error & { errorCode?: string };
    err.errorCode = 'CANCEL_NOT_ALLOWED';
    throw err;
  }
}
