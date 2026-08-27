/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              UNIFIED WORKFLOW RUNTIME ENGINE                         ║
 * ║              SINGLE SOURCE OF TRUTH FOR ALL DOMAINS                  ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║   Universal Lifecycle (the ONE law every domain follows):            ║
 * ║                                                                      ║
 * ║   REQUESTED → MATCHING → ASSIGNED → CONFIRMED → IN_PROGRESS          ║
 * ║                                                  → COMPLETED         ║
 * ║                                                  → CANCELLED         ║
 * ║                                                                      ║
 * ║   Domains (pharmacy, lab, radiology, nursing, consultation) own      ║
 * ║   only their persistence + side-effects. Every state transition      ║
 * ║   MUST be funneled through `WorkflowRuntimeEngine.apply(...)`.       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import {
  Module, Injectable, BadRequestException, Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, Public } from '../../common/auth.guard';
import {
  UserRole, ProviderStatus,
  ServiceState, ServiceDomain, UNIFIED_TRANSITIONS,
} from '../../common/enums';
import { Order, OrderDocument, OrderSchema } from '../../schemas/order.schema';
import { LabBooking, LabBookingSchema } from '../../schemas/lab.schema';
import { RadiologyBooking, RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { Facility, FacilitySchema, FacilityDocument } from '../../schemas/facility.schema';
import { EventBusService } from '../events/event-bus.service';

/* ──────────────────────────────────────────────────────────────────────
 *   DOMAIN-STATE → UNIVERSAL-STATE MAP (the ONLY place mapping exists)
 * ────────────────────────────────────────────────────────────────────── */
export const STATE_MAP: Record<ServiceDomain, Record<string, ServiceState>> = {
  pharmacy: {
    DRAFT: ServiceState.REQUESTED,
    CREATED: ServiceState.REQUESTED,
    VALIDATED: ServiceState.REQUESTED,
    BROADCAST: ServiceState.MATCHING,
    BROADCASTING: ServiceState.MATCHING,
    PHARMACY_BROADCAST: ServiceState.MATCHING,
    AWAITING_FULL_ACCEPTANCE: ServiceState.MATCHING,
    READY_FOR_SPLIT: ServiceState.MATCHING,
    ALLOCATING: ServiceState.MATCHING,
    ESCALATED_TO_ADMIN: ServiceState.MATCHING,
    FULLY_ALLOCATED: ServiceState.ASSIGNED,
    PHARMACY_RECEIVED: ServiceState.ASSIGNED,
    ACCEPTED: ServiceState.CONFIRMED,
    PHARMACY_ACCEPTED: ServiceState.CONFIRMED,
    CONFIRMED: ServiceState.CONFIRMED,
    PARTIALLY_CONFIRMED: ServiceState.CONFIRMED,
    REJECTED: ServiceState.CANCELLED,
    PARTIALLY_FULFILLED: ServiceState.IN_PROGRESS,
    IN_FULFILLMENT: ServiceState.IN_PROGRESS,
    PREPARING: ServiceState.IN_PROGRESS,
    PHARMACY_PROCESSING: ServiceState.IN_PROGRESS,
    READY_FOR_PICKUP: ServiceState.IN_PROGRESS,
    READY_FOR_DISPATCH: ServiceState.IN_PROGRESS,
    ASSIGNED_TO_DELIVERY: ServiceState.IN_PROGRESS,
    OUT_FOR_DELIVERY: ServiceState.IN_PROGRESS,
    DELIVERED: ServiceState.COMPLETED,
    COMPLETED: ServiceState.COMPLETED,
    EXPIRED: ServiceState.CANCELLED,
    CANCELLED: ServiceState.CANCELLED,
  },
  lab: {
    CREATED: ServiceState.REQUESTED,
    NEW_REQUEST: ServiceState.REQUESTED,
    PENDING_PAYMENT: ServiceState.REQUESTED,
    PENDING_INSURANCE: ServiceState.REQUESTED,
    WAITING_COPAY: ServiceState.REQUESTED,
    CONFIRMED: ServiceState.CONFIRMED,
    SCHEDULED: ServiceState.CONFIRMED,
    IN_TRANSIT: ServiceState.IN_PROGRESS,
    SAMPLE_COLLECTED: ServiceState.IN_PROGRESS,
    PROCESSING: ServiceState.IN_PROGRESS,
    IN_LAB: ServiceState.IN_PROGRESS,
    RESULT_READY: ServiceState.IN_PROGRESS,
    RESULT_UPLOADED: ServiceState.IN_PROGRESS,
    SAMPLE_REJECTED: ServiceState.IN_PROGRESS,
    REPORTED: ServiceState.COMPLETED,
    REPORT_READY: ServiceState.COMPLETED,
    CANCELLED: ServiceState.CANCELLED,
  },
  radiology: {
    PENDING: ServiceState.REQUESTED,
    CREATED: ServiceState.REQUESTED,
    NEW_REQUEST: ServiceState.REQUESTED,
    PENDING_PAYMENT: ServiceState.REQUESTED,
    PENDING_INSURANCE: ServiceState.REQUESTED,
    WAITING_COPAY: ServiceState.REQUESTED,
    CONFIRMED: ServiceState.CONFIRMED,
    SCHEDULED: ServiceState.CONFIRMED,
    ARRIVED_CHECKIN: ServiceState.IN_PROGRESS,
    IN_PROGRESS: ServiceState.IN_PROGRESS,
    IN_SCANNING: ServiceState.IN_PROGRESS,
    IMAGING_DONE: ServiceState.IN_PROGRESS,
    REPORT_DRAFT: ServiceState.IN_PROGRESS,
    UNDER_REVIEW: ServiceState.IN_PROGRESS,
    REPORT_READY: ServiceState.COMPLETED,
    REPORT_PUBLISHED: ServiceState.COMPLETED,
    COMPLETED: ServiceState.COMPLETED,
    SCAN_ABORTED: ServiceState.CANCELLED,
    CANCELLED: ServiceState.CANCELLED,
  },
  nursing: {
    NEW_REQUEST: ServiceState.REQUESTED,
    CREATED: ServiceState.REQUESTED,
    REQUESTED: ServiceState.REQUESTED,
    BROADCASTING: ServiceState.MATCHING,
    OFFERED: ServiceState.MATCHING,
    ASSIGNED: ServiceState.ASSIGNED,
    PROVIDER_ASSIGNED: ServiceState.ASSIGNED,
    NURSE_CONFIRMED: ServiceState.CONFIRMED,
    CONFIRMED: ServiceState.CONFIRMED,
    EN_ROUTE: ServiceState.IN_PROGRESS,
    IN_TRANSIT: ServiceState.IN_PROGRESS,
    ARRIVED: ServiceState.IN_PROGRESS,
    CARE_IN_PROGRESS: ServiceState.IN_PROGRESS,
    ON_THE_WAY: ServiceState.IN_PROGRESS,
    IN_PROGRESS: ServiceState.IN_PROGRESS,
    COMPLETED: ServiceState.COMPLETED,
    NO_SHOW: ServiceState.CANCELLED,
    ESCALATED_EMERGENCY: ServiceState.CANCELLED,
    CANCELLED: ServiceState.CANCELLED,
  },
  consultation: {
    PENDING: ServiceState.REQUESTED,
    REQUESTED: ServiceState.REQUESTED,
    RESCHEDULED: ServiceState.CONFIRMED,
    SCHEDULED: ServiceState.CONFIRMED,
    CONFIRMED: ServiceState.CONFIRMED,
    ASSIGNED: ServiceState.ASSIGNED,
    CHECKED_IN: ServiceState.IN_PROGRESS,
    IN_PROGRESS: ServiceState.IN_PROGRESS,
    ONGOING: ServiceState.IN_PROGRESS,
    COMPLETED: ServiceState.COMPLETED,
    NO_SHOW: ServiceState.CANCELLED,
    CANCELLED: ServiceState.CANCELLED,
  },
};

export function toUniversal(kind: ServiceDomain, domainState: string): ServiceState {
  const normalized = String(domainState || '').trim().toUpperCase();
  const mapped = STATE_MAP[kind]?.[normalized];
  if (!mapped) throw new BadRequestException({ error: 'unknown_domain_state', kind, domain_state: domainState });
  return mapped;
}

/**
 * Reverse lookup — given a universal state, returns all domain-specific
 * state values for that kind whose universal mapping equals the target.
 * Used by inboxes/dashboards to query domain collections by universal state
 * without hard-coding domain enums.
 */
export function domainStatesFor(kind: ServiceDomain, universal: ServiceState): string[] {
  const m = STATE_MAP[kind] || {};
  return Object.keys(m).filter(k => m[k] === universal);
}

/* ──────────────────────────────────────────────────────────────────────
 *   THE RUNTIME ENGINE
 * ────────────────────────────────────────────────────────────────────── */
@Injectable()
export class WorkflowEngineService {
  constructor(
    @InjectModel('Order') private orders: Model<OrderDocument>,
    @InjectModel('LabBooking') private labs: Model<LabBooking>,
    @InjectModel('RadiologyBooking') private rads: Model<RadiologyBooking>,
    @InjectModel('ProviderProfile') private providers: Model<any>,
    @InjectModel('Facility') private facilityModel: Model<FacilityDocument>,
    private bus: EventBusService,
  ) {}

  /**
   * Validate a transition under the universal lifecycle.
   * Throws BadRequestException with a structured reason if invalid.
   * Idempotent: from==to returns silently.
   */
  validate(kind: ServiceDomain, fromDomain: string, toDomain: string): { from: ServiceState; to: ServiceState } {
    const from = toUniversal(kind, fromDomain);
    const to = toUniversal(kind, toDomain);
    if (from === to) return { from, to };
    const allowed = UNIFIED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        error: 'invalid_transition',
        kind, from_domain: fromDomain, to_domain: toDomain,
        from_universal: from, to_universal: to,
        allowed_next: allowed,
      });
    }
    return { from, to };
  }

  private universalEventType(to: ServiceState): string {
    return ({
      [ServiceState.REQUESTED]: 'service.requested',
      [ServiceState.MATCHING]: 'service.matched',
      [ServiceState.ASSIGNED]: 'service.assigned',
      [ServiceState.CONFIRMED]: 'service.confirmed',
      [ServiceState.IN_PROGRESS]: 'service.started',
      [ServiceState.COMPLETED]: 'service.completed',
      [ServiceState.CANCELLED]: 'service.cancelled',
    } as any)[to];
  }

  private entityType(kind: ServiceDomain): string {
    return ({
      pharmacy: 'order',
      lab: 'lab_booking',
      radiology: 'radiology_booking',
      nursing: 'nursing_booking',
      consultation: 'appointment',
    } as any)[kind];
  }

  /**
   * THE ONE TRANSITION FUNCTION — validates, runs the mutation, emits the
   * normalized `service.*` event, writes rollback event on failure.
   * Every domain MUST use this for any non-creation state change.
   */
  async apply<T>(args: {
    kind: ServiceDomain;
    entity_id: string;
    from_domain: string;
    to_domain: string;
    actor_account_id?: string;
    actor_role?: string;
    reason?: string;
    patient_account_id?: string;
    meta?: any;
    mutate: () => Promise<T>;
  }): Promise<T> {
    const map = this.validate(args.kind, args.from_domain, args.to_domain);
    try {
      const result = await args.mutate();
      this.bus.emit({
        type: this.universalEventType(map.to),
        entity_type: this.entityType(args.kind),
        entity_id: args.entity_id,
        actor_account_id: args.actor_account_id,
        actor_role: args.actor_role,
        patient_account_id: args.patient_account_id,
        reason_code: args.reason,
        meta: {
          kind: args.kind,
          from_universal: map.from,
          to_universal: map.to,
          from_domain: args.from_domain,
          to_domain: args.to_domain,
          ...args.meta,
        },
      } as any).catch(() => null);
      return result;
    } catch (err: any) {
      await this.bus.emit({
        type: 'service.rollback',
        entity_type: this.entityType(args.kind),
        entity_id: args.entity_id,
        actor_account_id: args.actor_account_id,
        actor_role: args.actor_role,
        meta: {
          kind: args.kind,
          attempted_from: args.from_domain,
          attempted_to: args.to_domain,
          error: String(err?.message || err),
          universal_from: map.from,
          universal_to: map.to,
        },
      } as any).catch(() => null);
      throw err;
    }
  }

  /**
   * Alias for `apply()` to match the unified `engine.transition()` contract used
   * by domain services. Identical semantics — validates universal lifecycle,
   * runs the mutation, emits `service.*`, and writes `service.rollback` on failure.
   */
  async transition<T>(args: {
    kind: ServiceDomain;
    entity_id: string;
    from_domain: string;
    to_domain: string;
    actor_account_id?: string;
    actor_role?: string;
    reason?: string;
    patient_account_id?: string;
    meta?: any;
    mutate: () => Promise<T>;
  }): Promise<T> {
    return this.apply(args);
  }

  /**
   * Birth event — domains call this once at creation time so every new
   * booking carries the universal `service.requested` signal.
   */
  async announceCreated(args: {
    kind: ServiceDomain;
    entity_id: string;
    actor_account_id?: string;
    actor_role?: string;
    patient_account_id?: string;
    meta?: any;
  }) {
    this.bus.emit({
      type: 'service.requested',
      entity_type: this.entityType(args.kind),
      entity_id: args.entity_id,
      actor_account_id: args.actor_account_id,
      actor_role: args.actor_role,
      patient_account_id: args.patient_account_id,
      meta: { kind: args.kind, to_universal: ServiceState.REQUESTED, ...(args.meta || {}) },
    } as any).catch(() => null);
  }

  /* ──────────────────────────────────────────────────────────────────
   *   PROVIDER MATCHING ENGINE
   *   composite score = capability_match*40 + insurance*20
   *                   + availability*25 + distance*15
   * ────────────────────────────────────────────────────────────────── */
  async rankProviders(criteria: {
    kind: ServiceDomain;
    service_keys?: string[];
    service_ids?: string[];
    specialty?: string;
    insurance?: string;
    insurance_company?: string;
    insurance_network?: string;
    insurance_class?: string;
    accepts_insurance?: boolean;
    facility_accepts_insurance?: boolean;
    home_visit?: boolean;
    city?: string;
    location?: { lat: number; lng: number };
    max_results?: number;
  }) {
    const typeMap: Record<ServiceDomain, string | null> = {
      pharmacy: 'pharmacy', lab: 'lab', radiology: 'radiology',
      nursing: 'home_care', consultation: 'doctor',
    };
    const ptype = typeMap[criteria.kind];
    const filter: any = { status: ProviderStatus.ACTIVE };
    if (ptype) filter.type = ptype;
    if (criteria.home_visit) filter.home_visit_supported = true;
    if (criteria.city) filter.city = criteria.city;
    if (criteria.insurance) filter.accepted_insurance = criteria.insurance;

    const candidates: any[] = await this.providers
      .find(filter, { _id: 0, __v: 0, license_documents: 0 })
      .limit(120)
      .lean();

    const scoredPromises = candidates.map(async (p: any) => {
      // 1) Evaluate Insurance & Facility Filters
      let insuranceMatch = true;
      let hasCompany = true;
      let hasNetwork = true;
      let hasClass = true;

      const contracts = p.insurance_contracts || [];
      
      if (criteria.insurance_company) {
        hasCompany = (p.accepted_insurance || []).map((x: string) => x.toLowerCase()).includes(criteria.insurance_company.toLowerCase()) || 
                     contracts.some(c => c.company_id.toLowerCase() === criteria.insurance_company.toLowerCase());
      }
      
      if (criteria.insurance_network) {
        hasNetwork = contracts.some(c => c.network_id.toLowerCase() === criteria.insurance_network.toLowerCase());
      }

      if (criteria.insurance_class && criteria.insurance_network) {
        hasClass = contracts.some(c => 
          c.network_id.toLowerCase() === criteria.insurance_network.toLowerCase() &&
          (c.covered_classes.length === 0 || c.covered_classes.map((x: string) => x.toLowerCase()).includes(criteria.insurance_class.toLowerCase()))
        );
      }

      if (criteria.accepts_insurance) {
        const accepts = p.accepts_insurance || (p.accepted_insurance || []).length > 0 || contracts.length > 0;
        if (!accepts) insuranceMatch = false;
      }

      if (criteria.insurance_company || criteria.insurance_network || criteria.insurance_class) {
        insuranceMatch = insuranceMatch && hasCompany && hasNetwork && hasClass;
      }

      let facilityMatch = true;
      if (criteria.facility_accepts_insurance && p.facility_id) {
        const fac = await this.facilityModel.findOne({ id: p.facility_id }).lean();
        if (!fac) {
          facilityMatch = false;
        } else {
          const facContracts = fac.insurance_contracts || [];
          const facAccepts = fac.accepts_insurance || (fac.accepted_insurance || []).length > 0 || facContracts.length > 0;
          if (!facAccepts) {
            facilityMatch = false;
          } else if (criteria.insurance_company) {
            const facCompanyMatch = (fac.accepted_insurance || []).map((x: string) => x.toLowerCase()).includes(criteria.insurance_company.toLowerCase()) ||
                                    facContracts.some(c => c.company_id.toLowerCase() === criteria.insurance_company.toLowerCase());
            if (!facCompanyMatch) facilityMatch = false;
          }
        }
      }

      if (!insuranceMatch || !facilityMatch) return null;

      // 2) Capability match (max 40 pts)
      const totalCriteria =
        (criteria.service_keys?.length || 0) +
        (criteria.service_ids?.length || 0) +
        (criteria.specialty ? 1 : 0) || 1;
      let matched = 0;
      if (criteria.specialty) {
        const sp = criteria.specialty.toLowerCase();
        if (p.specialty?.toLowerCase().includes(sp)) matched++;
        if ((p.sub_specialties || []).some((s: string) => s.toLowerCase().includes(sp))) matched++;
      }
      for (const k of criteria.service_keys || []) {
        const kl = k.toLowerCase();
        if ((p.nursing_services || []).some((ns: any) => (ns.key || '').toLowerCase() === kl)) matched++;
        if ((p.test_categories || []).some((tc: string) => tc.toLowerCase().includes(kl))) matched++;
        if ((p.equipment_list || []).some((eq: string) => eq.toLowerCase().includes(kl))) matched++;
      }
      const cap = Math.min(40, (matched / totalCriteria) * 40);

      // 3) Insurance match (max 20 pts)
      let ins = 0;
      if (criteria.insurance_company) {
        ins = 20;
      } else if (criteria.insurance) {
        ins = (p.accepted_insurance || []).includes(criteria.insurance) ? 20 : (p.accepts_insurance ? 8 : 0);
      } else {
        ins = p.accepts_insurance ? 8 : 0;
      }

      // 4) Availability (max 25 pts)
      const avail = Math.min(
        25,
        (p.is_online !== false ? 15 : 5) +
        ((p.working_hours && Object.keys(p.working_hours).length) ? 10 : 0),
      );

      // 5) Distance via Haversine (max 15 pts)
      let dist = 0;
      let km: number | null = null;
      if (criteria.location && p.location?.lat && p.location?.lng) {
        km = haversine(criteria.location.lat, criteria.location.lng, p.location.lat, p.location.lng);
        const radius = p.coverage_radius_km || 10;
        if (km <= radius) dist = Math.max(0, 15 - km * (15 / Math.max(1, radius)));
      } else {
        dist = 7; // unknown distance default
      }

      const total = Math.round(cap + ins + avail + dist);
      return {
        ...p,
        distance_km: km !== null ? Math.round(km * 10) / 10 : null,
        _score: {
          total,
          capability: Math.round(cap),
          insurance: ins,
          availability: avail,
          distance: Math.round(dist),
        },
      };
    });

    const scoredResults = await Promise.all(scoredPromises);
    const scored = scoredResults.filter(x => x !== null) as any[];

    scored.sort((a, b) => b._score.total - a._score.total);
    return scored.slice(0, criteria.max_results || 30);
  }

  /**
   * BOOKING ORCHESTRATOR — single entry-point used by the unified-bookings
   * orchestrator. Emits REQUESTED + MATCHING events and returns ranked
   * providers ready for ASSIGNED. The caller is responsible for persisting
   * the domain entity once a provider is selected.
   */
  async orchestrate(args: {
    kind: ServiceDomain;
    patient_account_id: string;
    service_keys?: string[];
    service_ids?: string[];
    specialty?: string;
    insurance?: string;
    home_visit?: boolean;
    city?: string;
    location?: { lat: number; lng: number };
  }) {
    const trace_id = `${args.kind}-${args.patient_account_id.slice(0, 6)}-${Date.now()}`;
    await this.bus.emit({
      type: 'service.requested',
      entity_type: 'orchestration',
      entity_id: trace_id,
      actor_account_id: args.patient_account_id,
      actor_role: 'patient',
      meta: { ...args, to_universal: ServiceState.REQUESTED },
    } as any).catch(() => null);
    await this.bus.emit({
      type: 'service.matched',
      entity_type: 'orchestration',
      entity_id: trace_id,
      actor_role: 'system',
      meta: { kind: args.kind, to_universal: ServiceState.MATCHING },
    } as any).catch(() => null);
    const ranked = await this.rankProviders(args);
    return { trace_id, providers: ranked, universal_state: ServiceState.MATCHING };
  }

  /**
   * Convenience: turn a list of domain entities into a universal-state
   * stream for timelines.
   */
  toUniversalView(kind: ServiceDomain, domainState: string): ServiceState {
    return toUniversal(kind, domainState);
  }
}

/* ──────────────────────────────────────────────────────────────────────
 *   PUBLIC ENGINE API
 * ────────────────────────────────────────────────────────────────────── */
@Controller('workflow')
export class WorkflowController {
  constructor(private engine: WorkflowEngineService) {}

  /** Anyone can read the contract — used by docs + clients. */
  @Public() @Get('lifecycle')
  lifecycle() {
    return {
      states: Object.values(ServiceState),
      transitions: UNIFIED_TRANSITIONS,
      kind_state_map: STATE_MAP,
      events: [
        'service.requested',
        'service.matched',
        'service.assigned',
        'service.confirmed',
        'service.started',
        'service.completed',
        'service.cancelled',
        'service.rollback',
      ],
    };
  }

  /** Project any domain state to the universal lifecycle. */
  @Public() @Get('universal')
  universal(@Query('kind') kind: ServiceDomain, @Query('state') state: string) {
    return { kind, domain_state: state, universal_state: toUniversal(kind, state) };
  }

  /** Provider matching endpoint — frontends call this for smart match. */
  @UseGuards(JwtAuthGuard) @Post('match')
  match(@Body() b: any) {
    return this.engine.rankProviders({
      kind: b.kind,
      service_keys: b.service_keys,
      service_ids: b.service_ids,
      specialty: b.specialty,
      insurance: b.insurance,
      insurance_company: b.insurance_company,
      insurance_network: b.insurance_network,
      insurance_class: b.insurance_class,
      accepts_insurance: b.accepts_insurance,
      facility_accepts_insurance: b.facility_accepts_insurance,
      home_visit: b.home_visit,
      city: b.city,
      location: b.location,
      max_results: b.max_results,
    });
  }

  /** Admin-only diagnostic — dump full state map for debugging. */
  @UseGuards(JwtAuthGuard) @Roles(UserRole.ADMIN) @Get('debug/state-map')
  debug() {
    return STATE_MAP;
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'Order', schema: OrderSchema },
    { name: 'LabBooking', schema: LabBookingSchema },
    { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
    { name: 'ProviderProfile', schema: ProviderProfileSchema },
    { name: 'Facility', schema: FacilitySchema },
  ])],
  controllers: [WorkflowController],
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService],
})
export class WorkflowEngineModule {}
