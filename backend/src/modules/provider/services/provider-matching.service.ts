import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderRequest, ProviderRequestType, ProviderRequestPriority } from '../schemas/requests.schema';
import { ProviderAccount, ProviderProfile } from '../schemas';
import { ProviderAvailability, ProviderAvailabilityStatus } from '../schemas/requests.schema';
import { eligibleProviderTypesFor } from '../schemas/capabilities.schema';
import { GeoEngineService, LatLng } from './geo-engine.service';
import { ServiceCapabilityService } from './service-capability.service';
import { SchedulingEngineService } from './scheduling-engine.service';
import { ProviderScoringService } from './provider-scoring.service';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";

export interface MatchCandidate {
  provider_account_id: string;
  display_name?: string;
  provider_type: string;
  distance_km: number;
  in_zone: boolean;
  capacity_ok: boolean;
  availability: string;
  reliability_score: number;
  acceptance_rate: number;
  workload: number;
  capability_ok: boolean;
  capability_price?: number;
  priority_boost: number;
  total_score: number; // 0..1000
  breakdown: Record<string, number>;
  meta: any;
}

export interface MatchInput {
  type: ProviderRequestType | string;
  patient_location?: LatLng;
  payload?: any;
  priority?: ProviderRequestPriority;
  scheduled_at?: Date;
  duration_minutes?: number;
  exclude_provider_ids?: string[];
  max_results?: number;
  required_provider_type?: string; // optional explicit filter
}

@Injectable()
export class ProviderMatchingService {
  private logger = new Logger('ProviderMatching');
  constructor(
    @Inject('ProviderRequestRepository') private requests: ProviderRequestRepository,
    @Inject('ProviderAccountRepository') private accounts: ProviderAccountRepository,
    @Inject('ProviderAccountProfileRepository') private profiles: ProviderAccountProfileRepository,
    @Inject('ProviderAvailabilityRepository') private avails: ProviderAvailabilityRepository,
    private readonly geo: GeoEngineService,
    private readonly capability: ServiceCapabilityService,
    private readonly scheduling: SchedulingEngineService,
    private readonly scoring: ProviderScoringService,
  ) {}

  /**
   * Rank eligible providers for the given request.
   * Scoring weights (out of 1000):
   *   - Capability match: 250 (hard gate; provider excluded if !ok)
   *   - Distance: 200 (inverse — closer = higher)
   *   - Zone match: 100
   *   - Availability: 150 (online/accepting > busy > offline)
   *   - Reliability (composite): 150
   *   - Workload inverse: 100
   *   - Priority boost (urgent): 50
   *   - On-duty/scheduling: 50
   */
  async match(input: MatchInput): Promise<{ candidates: MatchCandidate[]; total_eligible: number; total_scanned: number }> {
    const reqType = input.type;
    const allowedProviderTypes = input.required_provider_type ? [input.required_provider_type] : eligibleProviderTypesFor(reqType);
    if (allowedProviderTypes.length === 0) return { candidates: [], total_eligible: 0, total_scanned: 0 };

    // 1) Approved active providers of the right type, not excluded
    const accountFilter: any = {
      status: 'approved',
      provider_type: { $in: allowedProviderTypes },
    };
    if (input.exclude_provider_ids?.length) accountFilter.id = { $nin: input.exclude_provider_ids };

    const accounts = await this.accounts.find(accountFilter, { id: 1, provider_type: 1, email: 1 }).lean();
    if (accounts.length === 0) return { candidates: [], total_eligible: 0, total_scanned: 0 };

    const ids = accounts.map((a) => a.id);
    const profiles = await this.profiles.find({ account_id: { $in: ids } }).lean();
    const profileMap = new Map<string, any>(profiles.map((p: any) => [p.account_id, p]));
    const availMap = new Map<string, any>(
      (await this.avails.find({ provider_account_id: { $in: ids } }).lean()).map((a: any) => [a.provider_account_id, a]),
    );
    const scoresMap = await this.scoring.getForIds(ids);

    const candidates: MatchCandidate[] = [];
    for (const a of accounts as any[]) {
      const profile = profileMap.get(a.id);
      const avail = availMap.get(a.id);
      const scoreSnap = scoresMap[a.id] || {};
      const breakdown: Record<string, number> = {};

      // ---- 1. CAPABILITY GATE ----
      const cap = await this.capability.hasCapabilityFor(a.id, String(reqType), input.payload || {});
      breakdown.capability = cap.ok ? 250 : 0;
      if (!cap.ok) continue; // hard gate

      // ---- 2. DISTANCE ----
      let distance_km = Number.POSITIVE_INFINITY;
      let in_zone = false;
      if (input.patient_location && profile?.geo?.lat != null) {
        distance_km = this.geo.distanceKm({ lat: profile.geo.lat, lng: profile.geo.lng }, input.patient_location);
        const zones = await this.capability.getZonesFor(a.id);
        in_zone = !!this.geo.matchZone(input.patient_location, zones);
        const radius = profile.geo.service_radius_km || 0;
        if (radius > 0 && distance_km > radius && !in_zone) {
          // outside service area — still allow but heavily penalize
          breakdown.distance = 0;
        } else {
          // inverse distance: <=2km full marks; 50km zero
          const norm = Math.max(0, 1 - distance_km / 50);
          breakdown.distance = Math.round(200 * norm);
        }
      } else {
        breakdown.distance = input.patient_location ? 50 : 200; // no geo info on either side => neutral
      }
      breakdown.zone = in_zone ? 100 : 0;

      // ---- 3. AVAILABILITY ----
      const aStatus = avail?.status || ProviderAvailabilityStatus.OFFLINE;
      const availPoints = {
        [ProviderAvailabilityStatus.ACCEPTING_ORDERS]: 150,
        [ProviderAvailabilityStatus.ONLINE]: 130,
        [ProviderAvailabilityStatus.BUSY]: 60,
        [ProviderAvailabilityStatus.OFFLINE]: 0,
      }[aStatus] || 0;
      breakdown.availability = availPoints;

      // ---- 4. RELIABILITY / SCORING ----
      const reliability = scoreSnap.reliability_score || 0; // 0..100
      breakdown.reliability = Math.round((reliability / 100) * 150);

      // ---- 5. WORKLOAD INVERSE ----
      const workload = await this.scheduling.getWorkload(a.id);
      // workload 0 => 100; >=10 => 0
      breakdown.workload = Math.round(100 * Math.max(0, 1 - Math.min(workload, 10) / 10));

      // ---- 6. PRIORITY ----
      let priority_boost = 0;
      if (input.priority === ProviderRequestPriority.URGENT) {
        // Urgent boosts available providers
        priority_boost = aStatus === ProviderAvailabilityStatus.ACCEPTING_ORDERS || aStatus === ProviderAvailabilityStatus.ONLINE ? 50 : 10;
      }
      breakdown.priority = priority_boost;

      // ---- 7. SCHEDULING / ON-DUTY ----
      let capacity_ok = true;
      let onDuty = false;
      if (input.scheduled_at) {
        const avail2 = await this.scheduling.checkAvailability(a.id, input.scheduled_at, input.duration_minutes || 30);
        capacity_ok = !!avail2.available;
        breakdown.scheduling = capacity_ok ? 50 : 0;
      } else {
        onDuty = await this.scheduling.isOnDuty(a.id);
        breakdown.scheduling = onDuty ? 30 : 10;
      }

      const total_score = Object.values(breakdown).reduce((s, v) => s + v, 0);

      candidates.push({
        provider_account_id: a.id,
        display_name: profile?.display_name_ar || profile?.legal_name || a.email,
        provider_type: a.provider_type,
        distance_km: Number.isFinite(distance_km) ? Math.round(distance_km * 10) / 10 : -1,
        in_zone,
        capacity_ok,
        availability: aStatus,
        reliability_score: reliability,
        acceptance_rate: scoreSnap.acceptance_rate || 0,
        workload,
        capability_ok: cap.ok,
        capability_price: cap.price,
        priority_boost,
        total_score,
        breakdown,
        meta: {
          capability_items: cap.matched_items?.length || 0,
        },
      });
    }

    candidates.sort((a, b) => b.total_score - a.total_score);
    const limited = candidates.slice(0, input.max_results || 20);
    return { candidates: limited, total_eligible: candidates.length, total_scanned: accounts.length };
  }

  /** Match candidates for an existing unassigned request. */
  async matchForRequest(request_id: string, max_results = 10) {
    const r = await this.requests.findOne({ id: request_id }).lean();
    if (!r) throw new NotFoundException('request not found');
    return this.match({
      type: r.type,
      patient_location: r.patient_location,
      payload: r.payload,
      priority: r.priority,
      scheduled_at: r.scheduled_at,
      duration_minutes: (r.payload as any)?.duration_minutes || 30,
      exclude_provider_ids: r.attempted_provider_ids || [],
      max_results,
    });
  }
}
