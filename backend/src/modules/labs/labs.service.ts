import { flattenResultEntries } from './lab-booking-results';
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ServiceUnavailableException, Inject, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LabService, LabBooking, LabBookingState, LAB_BOOKING_TRANSITIONS, LabSample } from '../../schemas/lab.schema';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
import { pickAttribution } from '../../common/attribution';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { LabPdfService } from './lab-pdf.service';
import { LabServiceRepository } from "./repositories/labservice.repository";
import { LabBookingRepository } from "./repositories/labbooking.repository";
import { LabSampleRepository } from "./repositories/labsample.repository";
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { pick } from '../../common/sanitize';

/** P3.3 (F15): writable catalog fields — LabService model vocabulary (lab.schema).
 * id/_id/is_deleted/governance flags excluded. */
/** The languages a test's preparation text can be written in (decision B8); the app shows the one for its language. */
export const PREPARATION_LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const;
/** A booking's report as listed to the clients: no file content (the file is served on its own route). */
export function reportSummary(r: any) {
  return { id: r?.id, name: r?.name, mime: r?.mime, uploaded_at: r?.uploaded_at, notes: r?.notes, has_file: typeof r?.base64 === 'string' && r.base64.length > 0 };
}

export const LAB_CATALOG_FIELDS = [
  'name_ar', 'name_en', 'short_code', 'description_ar', 'description_en', 'category', 'sample_type', 'price', 'old_price', 'fasting_required', 'fasting_hours', 'home_visit_supported', 'facility_visit_supported', 'turnaround_hours', 'preparation_ar', 'preparation_en', 'preparation_ur', 'preparation_hi', 'preparation_bn', 'preparation_tl', 'is_package', 'included_services', 'popularity', 'active', 'unavailable', 'medical_referral_required',
] as const;
import { getEffectiveRoles } from '../../common/auth.guard';
import { UserRole, isAdminUser } from '../../common/enums';
import { RedisService } from '../redis/redis.service';
import { BusinessRulesService } from '../business-rules/business-rules.module';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';
import { reviewUpdate, invalidateCatalogCache } from '../../common/catalog-review';
import { NAME_PROJECTION, withItemNames } from '../../common/booking-names';

import { nearestFirst } from '../provider/services/nearest-first';
import { publicLabFilter } from './labs-public';

/** Public card for a provider in carousels and price lists: no contact or account details. */
function publicProvider(p: any) {
  return { id: p.account_id, name_ar: p.name_ar ?? null, name_en: p.name_en ?? null, logo: p.logo ?? null, rating: p.rating_count > 0 ? p.rating_avg : null, rating_count: p.rating_count || 0 };
}

/**
 * The text search of the public lab list: a test is found by its name in any of the six languages the catalogue holds
 * (Arabic, English, and the Urdu/Hindi/Bengali/Filipino names written by the services content, Filipino stored as `tl`) or its
 * short code. The text is escaped, so it is matched literally.
 */
export function labSearchClause(search: string): Array<Record<string, RegExp>> {
  const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return ['name_ar', 'name_en', 'name_ur', 'name_hi', 'name_bn', 'name_tl', 'short_code'].map((field) => ({ [field]: re }));
}

@Injectable()
export class LabsService {
  constructor(
    @Inject('LabServiceRepository') private readonly svcModel: LabServiceRepository,
    @Inject('LabBookingRepository') private readonly bkgModel: LabBookingRepository,
    @Inject('LabSampleRepository') private readonly sampleModel: LabSampleRepository,
    @InjectModel(ProviderProfile.name) private readonly providerProfiles: Model<ProviderProfileDocument>,
    private readonly events: EventEmitter2,
    private readonly bus: EventBusService,
    private readonly engine: WorkflowEngineService,
    private readonly pdfService: LabPdfService,
    @Optional() private readonly redis?: RedisService,
    @Optional() private readonly pricing?: BusinessRulesService,
    @Optional() private readonly insurance?: InsuranceFlowService,
  ) {}

  async list(opts: { category?: string; search?: string; home_only?: boolean; packages_only?: boolean; highest_rated?: boolean; nearest?: boolean; lowest_price?: boolean; lat?: number; lng?: number }) {
    const q: any = { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' };
    if (opts.category) q.category = opts.category;
    if (opts.home_only) q.home_visit_supported = true;
    if (opts.packages_only) q.is_package = true;
    // Explicitly exclude any imaging entries — those belong to the separate Radiology module.
    q.$and = [{ category: { $ne: 'imaging' } }, { sample_type: { $ne: 'imaging' } }];
    if (opts.search) q.$or = labSearchClause(opts.search);
    
    let sortObj: any = { popularity: -1, name_ar: 1 };
    if (opts.highest_rated) sortObj = { rating: -1, popularity: -1 };
    else if (opts.lowest_price) sortObj = { price: 1, popularity: -1 };

    // #623: "nearest" orders tests by the closest approved lab that runs them (same compatibility rule as
    // compatibleProviders: the lab's test_categories hold the test id or its category). Without a valid
    // location the normal order is kept.
    if (opts.nearest && Number.isFinite(opts.lat) && Number.isFinite(opts.lng)) {
      const here = { lat: opts.lat as number, lng: opts.lng as number };
      const labs: any[] = await this.providerProfiles.find({
        type: { $in: ['lab', 'hospital'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved',
        'geo.lat': { $type: 'number' }, 'geo.lng': { $type: 'number' },
      }, { projection: { _id: 0, geo: 1, test_categories: 1 } }).lean();
      const services: any[] = await this.svcModel.find(q, { _id: 0, __v: 0 }).lean();
      return nearestFirst(services, labs, here, (svc, lab) => {
        const runs: unknown[] = Array.isArray(lab.test_categories) ? lab.test_categories : [];
        return runs.includes(svc.id) || (!!svc.category && runs.includes(svc.category));
      }).slice(0, 120);
    }

    if (!this.redis?.getWithSWR) return this.svcModel.find(q, { _id: 0, __v: 0 }).sort(sortObj).limit(120);
    const cacheKey = `cache:lab-services:public:v1:${JSON.stringify(opts)}`;
    return this.redis.getWithSWR(cacheKey, 900, async () => this.svcModel.find(q, { _id: 0, __v: 0 }).sort(sortObj).limit(120));
  }


  async categoryCounts() {
    const agg = await this.svcModel.aggregate([
      { $match: { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved', is_package: false, category: { $ne: 'imaging' }, sample_type: { $ne: 'imaging' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, slug: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    return agg;
  }

  async getById(id: string) {
    const s = await this.svcModel.findOne({ id, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, __v: 0 });
    if (!s) throw new NotFoundException();
    return s;
  }

  async compatibleProviders(testIds: string[]) {
    const ids = [...new Set((testIds || []).filter(Boolean))];
    if (!ids.length) return [];
    const services = await this.svcModel.find({ id: { $in: ids }, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, id: 1, category: 1, short_code: 1, name_ar: 1, price: 1 });
    if (services.length !== ids.length) return [];
    const categories = [...new Set(services.map((service: any) => service.category).filter(Boolean))];
    const profiles = await this.providerProfiles.find({
      type: { $in: ['lab', 'hospital'] },
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
      account_id: { $exists: true, $ne: null },
      // The lab registration stores the tests it runs (catalog service ids) in test_categories;
      // older profiles may hold category names. Either must cover every requested test.
      $or: [{ test_categories: { $all: ids } }, ...(categories.length ? [{ test_categories: { $all: categories } }] : [])],
    }, { _id: 0, account_id: 1, id: 1, name_ar: 1, name_en: 1, home_visit_supported: 1, rating_avg: 1, rating_count: 1, logo: 1 }).limit(50).lean();
    const prices = await this.labPrices(profiles.map((p: any) => p.account_id), services as any[]);
    return profiles.map((profile: any) => {
      const own = prices.get(profile.account_id);
      // #631: the lab's own total for the requested tests (its capability prices, a missing one at the catalog price);
      // null only when neither the lab nor the catalog has a price for some test.
      const total = (services as any[]).reduce<number | null>((sum, svc: any) => {
        const price = own?.get(svc.id) ?? (typeof svc.price === 'number' && svc.price > 0 ? svc.price : null);
        return sum === null || price === null ? null : sum + price;
      }, 0);
      return {
        id: profile.account_id,
        facility_id: profile.id,
        name: profile.name_ar || profile.name_en,
        homeVisitAvailable: Boolean(profile.home_visit_supported),
        rating: profile.rating_count > 0 ? profile.rating_avg : null,
        rating_count: profile.rating_count || 0,
        price: total,
        currency: 'SAR',
        logo: profile.logo || null,
      };
    });
  }

  /** The public profile of an approved lab by account id (GET /labs/:id); its priced tests from its capabilities. */
  async publicLab(id: string) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new NotFoundException('lab_not_found');
    const p: any = await this.providerProfiles.findOne(publicLabFilter(id), { _id: 0, account_id: 1, name_ar: 1, name_en: 1, logo: 1, description_ar: 1, description_en: 1, address: 1, home_visit_supported: 1, rating_avg: 1, rating_count: 1 }).lean();
    if (!p) throw new NotFoundException('lab_not_found');
    const items: any[] = await this.svcModel.db.collection('provider_capabilities_lab').find(
      { provider_account_id: { $eq: p.account_id }, available: true, price: { $gt: 0 } },
      { projection: { _id: 0, code: 1, name_ar: 1, name_en: 1, price: 1 } },
    ).limit(100).toArray();
    return {
      data: {
        id: p.account_id,
        name_ar: p.name_ar ?? null,
        name_en: p.name_en ?? null,
        city: typeof p.address?.city === 'string' ? p.address.city : null,
        address: [p.address?.district, p.address?.street].filter((x: unknown) => typeof x === 'string' && x).join(' ') || null,
        image: p.logo ?? null,
        description: p.description_ar || p.description_en || null,
        home_visit: Boolean(p.home_visit_supported),
        rating: p.rating_count > 0 ? p.rating_avg : null,
        rating_count: p.rating_count || 0,
        services: items.map((i) => ({ id: i.code, name_ar: i.name_ar ?? null, name_en: i.name_en ?? null, price: i.price })),
      },
    };
  }

  /**
   * Each lab's own price per catalog test, from the lab's capabilities (provider_capabilities_lab: code = the test id or
   * short code, or the same Arabic name; available and priced). Map: lab account id -> test id -> price.
   */
  private async labPrices(accountIds: string[], services: any[]): Promise<Map<string, Map<string, number>>> {
    const out = new Map<string, Map<string, number>>();
    const ids = [...new Set(accountIds.filter((id) => typeof id === 'string' && id))];
    if (!ids.length || !services.length) return out;
    const codes = [...new Set(services.flatMap((svc) => [svc.id, svc.short_code]).filter((c) => typeof c === 'string' && c))];
    const names = [...new Set(services.map((svc) => svc.name_ar).filter((n) => typeof n === 'string' && n))];
    const items: any[] = await this.svcModel.db.collection('provider_capabilities_lab').find({
      provider_account_id: { $in: ids }, available: true, price: { $gt: 0 },
      $or: [{ code: { $in: codes } }, ...(names.length ? [{ name_ar: { $in: names } }] : [])],
    }, { projection: { _id: 0, provider_account_id: 1, code: 1, name_ar: 1, price: 1 } }).toArray();
    for (const item of items) {
      const svc = services.find((s) => item.code === s.id || (s.short_code && item.code === s.short_code) || (s.name_ar && item.name_ar === s.name_ar));
      if (!svc || typeof item.price !== 'number') continue;
      const lab = out.get(item.provider_account_id) ?? new Map<string, number>();
      lab.set(svc.id, item.price);
      out.set(item.provider_account_id, lab);
    }
    return out;
  }

  // #624 carousel: popular approved tests, each with the approved labs that run it (the lab's
  // test_categories hold the test id or its category, the rule compatibleProviders uses).
  async getCarousel(category?: string, limit = 20) {
    const lim = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), 50);
    const q: any = { active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved', is_package: { $ne: true },
      $and: [{ category: { $ne: 'imaging' } }, { sample_type: { $ne: 'imaging' } }] };
    if (category) q.category = String(category);
    const services: any[] = await this.svcModel.find(q, { _id: 0, id: 1, name_ar: 1, name_en: 1, category: 1, price: 1, short_code: 1, image_url: 1 })
      .sort({ popularity: -1, name_ar: 1 }).limit(lim).lean();
    const labs: any[] = await this.providerProfiles.find({
      type: { $in: ['lab', 'hospital'] }, status: 'active', public_eligibility: true, medical_review_status: 'approved', account_id: { $exists: true, $ne: null },
    }, { _id: 0, account_id: 1, name_ar: 1, name_en: 1, logo: 1, rating_avg: 1, rating_count: 1, test_categories: 1 }).lean();
    return services.map((svc) => {
      const runs = labs.filter((p) => {
        const cats: unknown[] = Array.isArray(p.test_categories) ? p.test_categories : [];
        return cats.includes(svc.id) || (!!svc.category && cats.includes(svc.category));
      }).sort((a, b) => (b.rating_count > 0 ? b.rating_avg : 0) - (a.rating_count > 0 ? a.rating_avg : 0));
      return { ...svc, providers_count: runs.length, providers: runs.slice(0, 5).map(publicProvider) };
    });
  }

  // #631 price comparison: each approved lab's own price for this test from its capabilities
  // catalog (provider_capabilities_lab: code = the test's short code, or the same Arabic name,
  // the rule ServiceCapabilityService uses). Labs with no priced entry are not listed.
  async priceComparison(serviceId: string) {
    const svc: any = await this.svcModel.findOne({ id: { $eq: String(serviceId) }, active: true, is_deleted: { $ne: true }, public_eligibility: true, medical_review_status: 'approved' }, { _id: 0, id: 1, name_ar: 1, name_en: 1, short_code: 1, price: 1 }).lean();
    if (!svc) throw new NotFoundException('service_not_found');
    const codes = [svc.id, svc.short_code].filter(Boolean);
    const items: any[] = await this.svcModel.db.collection('provider_capabilities_lab').find({
      available: true, $or: [{ code: { $in: codes } }, ...(svc.name_ar ? [{ name_ar: svc.name_ar }] : [])],
    }, { projection: { _id: 0, provider_account_id: 1, price: 1, currency: 1, home_collection_supported: 1, turnaround_hours: 1, insurance_covered: 1 } }).toArray();
    return { service_id: svc.id, name_ar: svc.name_ar, name_en: svc.name_en, catalog_price: svc.price ?? null, offers: await this.priceOffers(items, ['lab', 'hospital']) };
  }

  private async priceOffers(items: any[], types: string[]) {
    const priced = items.filter((i) => typeof i.price === 'number' && i.price > 0);
    if (!priced.length) return [];
    const profiles: any[] = await this.providerProfiles.find({
      account_id: { $in: [...new Set(priced.map((i) => i.provider_account_id))] }, type: { $in: types },
      status: 'active', public_eligibility: true, medical_review_status: 'approved',
    }, { _id: 0, account_id: 1, name_ar: 1, name_en: 1, logo: 1, rating_avg: 1, rating_count: 1 }).lean();
    const byId = new Map(profiles.map((p) => [p.account_id, p]));
    return priced.filter((i) => byId.has(i.provider_account_id)).map((i) => ({
      provider: publicProvider(byId.get(i.provider_account_id)), price: i.price, currency: i.currency || 'SAR',
      home_collection_supported: !!i.home_collection_supported, turnaround_hours: i.turnaround_hours ?? null, insurance_covered: !!i.insurance_covered,
    })).sort((a, b) => a.price - b.price);
  }

  async book(user: any, data: any) {
    if (!Array.isArray(data.items) || !data.items.length) throw new BadRequestException('items required');
    if (!data.scheduled_at) throw new BadRequestException('scheduled_at required');
    const services = await this.svcModel.find({ id: { $in: data.items.map((x: any) => x.service_id) } });
    if (!services.length) throw new BadRequestException('no_valid_services');
    const paymentMethod = ['cash', 'card', 'insurance'].includes(data.payment_method) ? data.payment_method : 'cash';
    // Normalize location_type: schema enum is home|facility — accept clinic aliases
    if (['in_clinic', 'clinic', 'lab', 'center'].includes(data.location_type)) data.location_type = 'facility';
    if (!['home', 'facility'].includes(data.location_type)) data.location_type = 'home';
    // Enforce Nabd payment policy
    const svcCtx = data.location_type === 'home' ? 'home_visit' : 'in_clinic';
    const pmAllowed: Record<string, string[]> = {
      home_visit: ['card', 'insurance'],
      in_clinic: ['cash', 'card', 'insurance'],
    };
    if (!pmAllowed[svcCtx]?.includes(paymentMethod)) {
      throw new BadRequestException(`payment_method_${paymentMethod}_not_allowed_for_${svcCtx}`);
    }
    // Phase Stabilization: explicit provider selection is mandatory for patient bookings.
    // Admin/system roles may create without provider_account_id (e.g. seeding, manual ops).
    if (!data.provider_account_id && user.role !== 'admin' && user.role !== 'system') {
      throw new BadRequestException('provider_account_id_required');
    }
    const documents: any[] = Array.isArray(data.documents) ? data.documents.map((d: any) => ({ ...d, uploaded_at: new Date() })) : [];
    // Home rule: insurance + home requires uploaded doctor_request OR preauth
    if (data.location_type === 'home' && paymentMethod === 'insurance') {
      const hasProof = documents.some(d => d.kind === 'doctor_request' || d.kind === 'preauth');
      if (!hasProof) throw new BadRequestException('insurance_home_requires_doctor_request_or_preauth');
    }
    // Home visit support check
    if (data.location_type === 'home' && services.some((s: any) => !s.home_visit_supported)) {
      throw new BadRequestException('some_services_not_home_eligible');
    }
    // Slot collision protection: prevent booking past slots + enforce per-slot capacity
    const slotTime = new Date(data.scheduled_at);
    if (slotTime.getTime() < Date.now() - 5 * 60_000) {
      throw new BadRequestException('slot_expired');
    }
    if (data.provider_account_id) {
      const slotWindow = 30 * 60_000; // 30-minute window for collision check
      const overlapping = await this.bkgModel.countDocuments({
        provider_account_id: data.provider_account_id,
        scheduled_at: { $gte: new Date(slotTime.getTime() - slotWindow), $lt: new Date(slotTime.getTime() + slotWindow) },
        state: { $nin: [LabBookingState.CANCELLED, LabBookingState.REPORTED] },
      });
      // Default max-per-slot=1 unless provider schedule says more; soft cap at 3 for safety
      if (overlapping >= 3) throw new BadRequestException('slot_taken');
    }
    // #631: the chosen lab's own price per test when it set one (the price the comparison showed), else the catalog price.
    const own = data.provider_account_id ? (await this.labPrices([String(data.provider_account_id)], services as any[])).get(String(data.provider_account_id)) : undefined;
    const items = services.map((s: any) => ({ service_id: s.id, name_ar: s.name_ar, name_en: s.name_en, price: own?.get(s.id) ?? s.price, sample_type: s.sample_type, fasting_required: s.fasting_required }));
    // S4 duplicate-booking prevention: a retried/double-tapped submit by the same patient
    // for the same service set within 3 minutes returns the ORIGINAL booking (idempotent)
    // instead of creating a second one.
    const dupWindow = new Date(Date.now() - 3 * 60_000);
    const svcIds = data.items.map((x: any) => x.service_id).sort();
    const recent = await this.bkgModel.find({
      patient_id: user.id,
      createdAt: { $gte: dupWindow },
      state: { $nin: [LabBookingState.CANCELLED, LabBookingState.REPORTED] },
    }).lean();
    const dupe = recent.find((b: any) => JSON.stringify((b.items || []).map((i: any) => i.service_id).sort()) === JSON.stringify(svcIds));
    if (dupe) return dupe;
    // R6-4: home-collection fee comes from the saved platform pricing (admin config-portal).
    let homeFee = 25;
    try {
      const fees = await this.pricing?.platformFees();
      if (fees && Number.isFinite(fees.delivery_fee) && fees.delivery_fee >= 0) homeFee = fees.delivery_fee;
    } catch { /* booking never fails on pricing config */ }
    const total = items.reduce((sum, i) => sum + (i.price || 0), 0) + (data.location_type === 'home' ? homeFee : 0);
    const insurance_status = paymentMethod === 'insurance' ? 'pending' : 'none';
    const booking = await this.bkgModel.create({
      patient_id: user.id,
      patient_name: data.contact?.name || user.full_name,
      patient_phone: data.contact?.phone || user.phone,
      items,
      total,
      location_type: data.location_type || 'facility',
      facility_id: data.facility_id,
      provider_account_id: data.provider_account_id,
      address: data.address,
      scheduled_at: new Date(data.scheduled_at),
      state: LabBookingState.NEW_REQUEST,
      state_history: [{ from: '', to: LabBookingState.NEW_REQUEST, by_user_id: user.id, by_role: user.role, at: new Date() }],
      notes: data.notes,
      payment_method: paymentMethod,
      insurance_provider: data.insurance_provider,
      insurance_member_id: data.insurance_member_id,
      insurance_status,
      documents,
      // P17-17.5: campaign attribution for the campaign report.
      attribution: pickAttribution(data) ?? undefined,
    });
    this.events.emit('lab.booking_created', { booking_id: booking.id, patient_id: user.id, tracking_id: booking.tracking_id });
    this.events.emit('lab.booking_state_changed', { booking_id: booking.id, patient_id: user.id, state: booking.state, tracking_id: booking.tracking_id });
    await this.engine.announceCreated({ kind: 'lab', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { tracking_id: booking.tracking_id, items: items.length, total, location_type: booking.location_type, payment_method: paymentMethod } });
    if (paymentMethod === 'insurance') {
      this.bus.emit({ type: 'insurance.pending', entity_type: 'lab_booking', entity_id: booking.id, patient_account_id: user.id, reason_code: data.insurance_provider || 'unknown_provider', meta: { docs: documents.length } }).catch(() => null);
      // LJ-03: open the insurance request now so the provider decides a real request
      // and the patient pays the copay through the engine checkout.
      if (this.insurance) {
        try {
          const request: any = await this.insurance.createRequest(user, { booking_kind: 'lab', booking_id: booking.id });
          booking.insurance_request_id = request.id;
          booking.insurance_status = 'pending';
          booking.state = LabBookingState.PENDING_INSURANCE;
          booking.state_history.push({ from: LabBookingState.NEW_REQUEST, to: LabBookingState.PENDING_INSURANCE, by_user_id: 'system', by_role: 'system', at: new Date(), note: 'insurance request opened' });
          await booking.save();
        } catch { /* policy missing or price not ready — the provider decision path will retry */ }
      }
    }
    if (booking.location_type === 'home') {
      this.bus.emit({ type: 'home_visit.assigned', entity_type: 'lab_booking', entity_id: booking.id, patient_account_id: user.id, meta: { facility_id: booking.facility_id } }).catch(() => null);
    }
    return booking.toObject();
  }

  /**
   * M3: a booking whose price was already fixed by an ordering quote (the provider's own per-mode prices plus its home fee).
   * It is stored exactly as the quote showed it, so a later change of the provider's prices cannot move the total; the
   * checks of the quote (candidate, radius, order) were made by the ordering engine before this is called.
   */
  async createPriced(user: any, input: {
    provider_account_id: string; mode: 'home' | 'facility'; items: Array<{ service_id: string; name_ar?: string; name_en?: string; price: number; coverage?: string }>;
    home_fee: number; scheduled_at: Date; asap: boolean; payment_method: 'cash' | 'card' | 'insurance'; awaiting_approval: boolean;
    address?: { lat?: number; lng?: number }; order_group_id: string; quote_id: string; medical_order_id?: string;
    gender_preference?: string; documents?: any[]; notes?: string; patient_name?: string;
  }) {
    const total = Math.round((input.items.reduce((s, i) => s + i.price, 0) + (input.mode === 'home' ? input.home_fee : 0)) * 100) / 100;
    const state = input.awaiting_approval ? LabBookingState.PENDING_INSURANCE : LabBookingState.NEW_REQUEST;
    const now = new Date();
    const booking = await this.bkgModel.create({
      patient_id: user.id,
      patient_name: input.patient_name || user.full_name,
      patient_phone: user.phone,
      items: input.items,
      total, total_price: total,
      service_fee: Math.round((total - (input.mode === 'home' ? input.home_fee : 0)) * 100) / 100,
      home_visit_fee: input.mode === 'home' ? input.home_fee : 0,
      location_type: input.mode,
      address: input.address,
      scheduled_at: input.scheduled_at,
      scheduled_start: input.scheduled_at,
      scheduled_asap: input.asap,
      state,
      status: input.awaiting_approval ? 'awaiting_approval' : 'pending',
      state_history: [{ from: '', to: state, by_user_id: user.id, by_role: user.role, at: now }],
      provider_account_id: input.provider_account_id,
      payment_method: input.payment_method,
      insurance_status: input.payment_method === 'insurance' ? 'pending' : 'none',
      documents: input.documents ?? [],
      notes: input.notes,
      order_group_id: input.order_group_id,
      price_locked_at: now,
      price_lock: { quote_id: input.quote_id, items: input.items.map((i) => ({ catalog_id: i.service_id, price: i.price, ...(i.coverage ? { coverage: i.coverage } : {}) })), home_fee: input.mode === 'home' ? input.home_fee : 0 },
      medical_order_id: input.medical_order_id,
      gender_preference: input.gender_preference,
    });
    this.events.emit('lab.booking_created', { booking_id: booking.id, patient_id: user.id, tracking_id: booking.tracking_id });
    this.events.emit('lab.booking_state_changed', { booking_id: booking.id, patient_id: user.id, state: booking.state, tracking_id: booking.tracking_id });
    await this.engine.announceCreated({ kind: 'lab', entity_id: booking.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { tracking_id: booking.tracking_id, items: input.items.length, total, location_type: input.mode, payment_method: input.payment_method } });
    if (input.payment_method === 'insurance') {
      this.bus.emit({ type: 'insurance.pending', entity_type: 'lab_booking', entity_id: booking.id, patient_account_id: user.id, reason_code: 'ordering_quote', meta: { docs: (input.documents ?? []).length } }).catch(() => null);
    }
    return booking.toObject();
  }

  /**
   * M5: the provider's item decisions are recorded by the ordering service; this moves the booking. An approved booking waits for
   * the copay (the existing insurance path); a partial or rejected one stays put until the patient chooses.
   */
  async applyOrderingDecision(id: string, outcome: 'approved' | 'partial' | 'rejected', copay: number) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    b.insurance_status = outcome === 'approved' ? 'approved' : outcome === 'partial' ? 'partial_approval' : 'rejected';
    b.insurance_copay = copay;
    if (outcome === 'approved') {
      b.status = 'pending';
      await this.moveOrdering(b, LabBookingState.WAITING_COPAY, 'insurance_item_decisions', 'provider');
    } else {
      b.status = 'awaiting_patient_choice';
      await b.save();
    }
    return b.toObject();
  }

  /** M5: the patient's answer to a partial or rejected approval. `drop` removes the rejected items and recomputes the total. */
  async applyOrderingChoice(id: string, user: any, c: { choice: 'pay_difference' | 'covered_only' | 'cancel_free'; copay: number; drop?: string[] }) {
    const b = await this.bkgModel.findOne({ id, patient_id: user.id });
    if (!b) throw new NotFoundException();
    if (c.choice === 'cancel_free') {
      // a cancel that the lifecycle refuses is an error, never a half-cancelled booking
      if (b.state !== LabBookingState.CANCELLED && !(LAB_BOOKING_TRANSITIONS[b.state as LabBookingState] || []).includes(LabBookingState.CANCELLED)) throw new BadRequestException(`invalid transition ${b.state} → ${LabBookingState.CANCELLED}`);
      b.status = 'cancelled';
      await this.moveOrdering(b, LabBookingState.CANCELLED, 'insurance_choice_cancel_free', 'patient', user);
      this.events.emit('lab.booking_cancelled', { booking_id: b.id, patient_id: b.patient_id });
      return b.toObject();
    }
    if (c.choice === 'covered_only' && c.drop?.length) {
      b.items = b.items.filter((i: any) => !c.drop!.includes(i.service_id));
      b.markModified('items');
      if (b.price_lock) {
        b.price_lock = { ...b.price_lock, items: b.price_lock.items.filter((i) => !c.drop!.includes(i.catalog_id)) };
        b.markModified('price_lock');
      }
      const sum = Math.round(b.items.reduce((s: number, i: any) => s + (Number(i.price) || 0), 0) * 100) / 100;
      b.service_fee = sum;
      b.total_price = Math.round((sum + (b.home_visit_fee || 0)) * 100) / 100;
      (b as any).total = b.total_price;
    }
    b.insurance_copay = c.copay;
    b.status = 'pending';
    await this.moveOrdering(b, LabBookingState.WAITING_COPAY, `insurance_choice_${c.choice}`, 'patient', user);
    return b.toObject();
  }

  /** M7: a booking the provider did not confirm in time is cancelled by the system. Returns false when it is already past that point. */
  async cancelUnconfirmed(id: string): Promise<boolean> {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (![LabBookingState.NEW_REQUEST, LabBookingState.PENDING_INSURANCE].includes(b.state)) return false;
    b.status = 'cancelled_unconfirmed';
    await this.moveOrdering(b, LabBookingState.CANCELLED, 'confirm_deadline_passed', 'system');
    this.events.emit('lab.booking_cancelled', { booking_id: b.id, patient_id: b.patient_id });
    return true;
  }

  private async moveOrdering(b: any, to: LabBookingState, note: string, by: string, user?: any) {
    if (b.state === to || !(LAB_BOOKING_TRANSITIONS[b.state as LabBookingState] || []).includes(to)) { await b.save(); return b.toObject(); }
    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: to,
      actor_account_id: user?.id ?? b.provider_account_id, actor_role: user?.role ?? by, patient_account_id: b.patient_id, reason: note,
      mutate: async () => {
        b.state_history.push({ from: b.state, to, by_user_id: user?.id ?? b.provider_account_id, by_role: user?.role ?? by, at: new Date(), note });
        b.state = to;
        await b.save();
        this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: to, tracking_id: b.tracking_id });
        return b.toObject();
      },
    });
  }

  async addDocument(id: string, user: any, body: { kind?: string; url_or_b64?: string; filename?: string }) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id && user.role !== 'admin') throw new ForbiddenException();
    b.documents.push({ kind: body.kind as any, url_or_b64: body.url_or_b64, filename: body.filename, uploaded_at: new Date() });
    await b.save();
    this.bus.emit({ type: 'booking.document_uploaded', entity_type: 'lab_booking', entity_id: b.id, actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, meta: { kind: body.kind } }).catch(() => null);
    return b.toObject();
  }

  /** LJ-03: the lab decision is a decision on the insurance request engine, not a
   * free-form status string. The booking mirrors the engine's server-computed
   * decision so the existing patient screen keeps working. */
  async updateInsuranceApproval(id: string, payload: { status?: string; totalCopay?: number; items?: any[]; reason?: string; approval_ref?: string }, user: any) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id: { $eq: id } });
    if (!b) throw new NotFoundException();
    // only the lab the booking is assigned to (or admin) decides its insurance coverage
    this.assertAssignedProviderOrAdmin(user, b);

    const rawStatus = String(payload?.status || '').trim().toLowerCase();
    const allowed = ['approved', 'approved_full', 'partial', 'partial_approval', 'approve_partial', 'rejected', 'reject'];
    if (rawStatus && !allowed.includes(rawStatus)) throw new BadRequestException('invalid_insurance_status');
    if (!this.insurance) throw new ServiceUnavailableException('insurance_engine_unavailable');

    let request: any = null;
    if (rawStatus) {
      const items = Array.isArray(payload.items) ? payload.items : [];
      const rejected = items.find((it: any) => it?.isCovered === false || it?.rejectReason);
      request = await this.insurance.providerDecideBooking(user, 'lab', id, {
        decision: rawStatus,
        approval_ref: payload.approval_ref,
        totalCopay: payload.totalCopay,
        copay: payload.totalCopay,
        reason: payload.reason || rejected?.rejectReason,
        rejectReason: rejected?.rejectReason,
      });
    }

    // Mirror the engine's decision onto the booking the patient screen reads.
    if (request) {
      b.insurance_request_id = request.id;
      b.insurance_copay = Number(request.copay_amount || 0);
      b.insurance_status = request.state === 'APPROVED_FULL' ? 'approved'
        : request.state === 'COPAY_PENDING' ? 'partial_approval'
          : request.state === 'REJECTED' ? 'rejected'
            : request.state === 'COPAY_PAID' ? 'approved' : b.insurance_status;
    }
    const items = payload.items;
    if (items && Array.isArray(items)) {
      for (const itemPayload of items) {
        const item = b.items.find((i: any) => i.service_id === itemPayload.service_id);
        if (item) {
          if (itemPayload.isCovered !== undefined) (item as any).isCovered = itemPayload.isCovered;
          if (itemPayload.rejectReason !== undefined) (item as any).rejectReason = itemPayload.rejectReason;
          if (itemPayload.cashPrice !== undefined) (item as any).cashPrice = itemPayload.cashPrice;
        }
      }
      b.markModified('items');
    }

    await b.save();
    if (rawStatus) {
      this.bus.emit({ type: rawStatus.startsWith('approv') || rawStatus.startsWith('partial') ? 'insurance.approved' : 'insurance.rejected', entity_type: 'lab_booking', entity_id: b.id, actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id }).catch(() => null);
    }
    return b.toObject();
  }

  /** LJ-03: opting into cash is an engine self-pay acceptance, so the patient then
   * pays the server-computed amount through the standard copay checkout. */
  async optInCash(id: string, serviceId: string, payload: { optInCash?: boolean }, user: any) {
    const b = await this.bkgModel.findOne({ id, patient_id: user.id });
    if (!b) throw new NotFoundException('Booking not found');

    const item = b.items.find((i: any) => i.service_id === serviceId);
    if (!item) throw new NotFoundException('Item not found');

    (item as any).optInCash = payload.optInCash ?? true;
    b.markModified('items');
    await b.save();

    if ((payload.optInCash ?? true) && this.insurance && b.insurance_request_id) {
      const request: any = await this.insurance.getOne(b.insurance_request_id, user).catch(() => null);
      if (request && ['REJECTED', 'APPROVED_PARTIAL'].includes(request.state)) {
        const updated = await this.insurance.acceptSelfPay(user, b.insurance_request_id).catch(() => null);
        if (updated) b.insurance_copay = Number(updated.copay_amount || 0);
      }
    }
    return b.toObject();
  }

  /**
   * R7-3: real technicians. A lab's team is invited through `provider/operators`
   * (`provider_operators.provider_account_id` = the lab account); hospital labs may also
   * link staff accounts via `parent_provider_account_id`/`facility_id`.
   */
  async listTechnicians(user: any) {
    const labId = String(user?.parent_provider_account_id || user?.facility_id || user?.id || '');
    const db: any = (this.bkgModel as any).db;
    const operators: any[] = await db.collection('provider_operators').find({
      provider_account_id: { $eq: labId },
      status: 'active',
      role: { $in: ['lab_technician', 'nurse', 'owner', 'admin'] },
    }, { projection: { _id: 0, id: 1, full_name: 1, email: 1, role: 1, status: 1 } })
      .limit(100).toArray().catch(() => []);
    const accounts: any[] = await db.collection('provider_accounts').find({
      $or: [{ facility_id: { $eq: labId } }, { parent_provider_account_id: { $eq: labId } }],
    }, { projection: { _id: 0, id: 1, user_id: 1, full_name: 1, email: 1, role: 1, status: 1 } })
      .limit(100).toArray().catch(() => []);
    const userIds = [...new Set(accounts.map((a: any) => String(a.user_id || a.id)).filter(Boolean))];
    const users: any[] = userIds.length
      ? await db.collection('users').find({ id: { $in: userIds } }, { projection: { _id: 0, id: 1, full_name: 1 } }).toArray().catch(() => [])
      : [];
    const names = new Map(users.map((u: any) => [String(u.id), u.full_name]));
    return [
      ...operators.map((o: any) => ({
        id: String(o.id), account_id: String(o.id), name: o.full_name || o.email || '—', role: o.role, status: o.status,
      })),
      ...accounts.map((a: any) => ({
        id: String(a.user_id || a.id),
        account_id: String(a.id),
        name: names.get(String(a.user_id || a.id)) || a.full_name || a.email || '—',
        role: a.role,
        status: a.status,
      })),
    ];
  }

  async mineFor(user: any) {
    const rows = await this.bkgModel.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(80).lean();
    return this.withLineNames(rows as any[]);
  }

  /** Issue 1832: every line of the bookings carries `names` in the six languages, resolved from the catalogue by `service_id` in one query. */
  private withLineNames(bookings: any[]) {
    return withItemNames(bookings, (ids) => this.svcModel.find({ id: { $in: ids } }, NAME_PROJECTION).lean());
  }

  async getBooking(id: string, user: any) {
    const b = await this.bkgModel.findOne({ id }, { _id: 0, __v: 0 }).lean();
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    // A report is listed by id and name only; its file is GET bookings/:id/reports/:reportId (journeys#54), so the
    // booking (polled every 15 s by the tracking screens) no longer carries every PDF as base64.
    // Design parity (#1819): the typed values of the booking's result documents, newest result first.
    const resultDocs = await this.bkgModel.db.collection('labresults')
      .find({ booking_id: id, patient_id: b.patient_id, source: { $ne: 'radiology' } }, { projection: { _id: 0, id: 1, entries: 1, reported_at: 1, critical: 1 } })
      .sort({ createdAt: -1 }).limit(20).toArray();
    const [named] = await this.withLineNames([b]);
    return { ...named, reports: (Array.isArray(b.reports) ? b.reports : []).map(reportSummary), results: flattenResultEntries(resultDocs) };
  }

  /** The file of one report of a booking, for the patient, the assigned lab or an admin. */
  async reportFile(id: string, reportId: string, user: any): Promise<{ name: string; mime: string; data: Buffer }> {
    const b: any = await this.bkgModel.findOne({ id }, { _id: 0, patient_id: 1, provider_account_id: 1, assigned_provider_id: 1, reports: 1 }).lean();
    if (!b) throw new NotFoundException();
    try { this.assertPatientOrAssignedProvider(user, b); } catch { throw new NotFoundException(); }
    const report = (Array.isArray(b.reports) ? b.reports : []).find((r: any) => r?.id === reportId);
    if (!report) throw new NotFoundException('report_not_found');
    if (typeof report.base64 !== 'string' || !report.base64) throw new NotFoundException('report_file_unavailable');
    const mime = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(report.mime) ? report.mime : 'application/pdf';
    return { name: String(report.name || `report-${reportId}.pdf`), mime, data: Buffer.from(report.base64, 'base64') };
  }

  async cancel(id: string, user: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (b.patient_id !== user.id && user.role !== 'admin') throw new NotFoundException();
    if ([LabBookingState.REPORTED, LabBookingState.CANCELLED].includes(b.state)) return b.toObject();
    return await this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.CANCELLED,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'user_cancelled',
      mutate: async () => {
        b.state_history.push({ from: b.state, to: LabBookingState.CANCELLED, by_user_id: user.id, by_role: user.role, at: new Date() });
        b.state = LabBookingState.CANCELLED;
        await b.save();
        this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: b.state, tracking_id: b.tracking_id });
        this.events.emit('lab.booking_cancelled', { booking_id: b.id, patient_id: b.patient_id });
        return b.toObject();
      },
    });
  }

  /** Provider/Admin only — transition lab booking through lifecycle. */
  async transition(id: string, to: LabBookingState, user: any, note?: string) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException('admin/lab only');
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    // Only the lab the patient booked (or admin) may move the booking.
    this.assertBookingOwner(user, b);
    const allowed = LAB_BOOKING_TRANSITIONS[b.state] || [];
    if (!allowed.includes(to)) throw new BadRequestException(`invalid transition ${b.state} → ${to}`);
    if (b.state === LabBookingState.NEW_REQUEST && to === LabBookingState.CONFIRMED) this.assertConfirmable(b);
    return await this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: to,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: note,
      mutate: async () => {
        b.state_history.push({ from: b.state, to, by_user_id: user.id, by_role: user.role, at: new Date(), note });
        b.state = to;
        await b.save();
        this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: to, tracking_id: b.tracking_id });
        return b.toObject();
      },
    });
  }

  /**
   * A new booking is accepted by the lab only when its payment is settled or deferred to the visit:
   * cash is only offered at the facility (collected there), card must be paid, insurance goes through
   * the coverage decision (POST /labs/bookings/:id/coverage-decision).
   */
  private assertConfirmable(b: any) {
    if (b.payment_method === 'insurance') throw new BadRequestException('insurance_booking_requires_coverage_decision');
    if (b.payment_method === 'card' && b.payment_status !== 'paid') throw new BadRequestException('card_payment_not_completed');
    if (b.payment_method === 'cash' && b.location_type !== 'facility') throw new BadRequestException('cash_only_at_facility');
  }

  /** Verified card payment confirms a new lab booking (server-side; the app never confirms unpaid card bookings). */
  @OnEvent('payment.completed')
  async confirmPaidBooking(event: any) {
    if (event?.booking_kind !== 'lab' || !event?.booking_id) return;
    const b = await this.bkgModel.findOne({ id: event.booking_id });
    if (!b || b.state !== LabBookingState.NEW_REQUEST || b.payment_method !== 'card') return;
    await this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.CONFIRMED,
      actor_account_id: 'system', actor_role: 'system', patient_account_id: b.patient_id, reason: `payment_verified:${event.transaction_id || ''}`,
      mutate: async () => {
        b.state_history.push({ from: b.state, to: LabBookingState.CONFIRMED, by_user_id: 'system', by_role: 'system', at: new Date(), note: 'card_payment_verified' });
        b.state = LabBookingState.CONFIRMED;
        (b as any).payment_status = 'paid';
        await b.save();
        this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: b.state, tracking_id: b.tracking_id });
        return b.toObject();
      },
    }).catch(() => null);
  }

  /** Provider/Admin list bookings for inbox. */
  async listForProvider(user: any, status?: string) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const q: any = {};
    if (user.role !== 'admin') q.provider_account_id = user.id;
    if (status) q.state = status;
    return this.bkgModel.find(q, { _id: 0, __v: 0 }).sort({ scheduled_at: 1 }).limit(200);
  }

  /** Provider: assign technician to a booking. */
  async assignTechnician(id: string, user: any, body: { technician_id?: string; technician_name?: string; notes?: string }) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id) throw new ForbiddenException();
    // R7-3: only a listed technician of this lab (or the caller themselves) may be assigned.
    const techId = String(body.technician_id || user.id);
    if (techId !== String(user.id)) {
      const team = await this.listTechnicians(user).catch(() => []);
      if (!team.some((t: any) => String(t.id) === techId)) throw new ForbiddenException('technician_not_on_team');
    }
    b.technician_id = techId;
    if (body.notes) b.notes = body.notes;
    await b.save();
    this.events.emit('lab.technician_assigned', { booking_id: b.id, patient_id: b.patient_id, technician_id: b.technician_id });
    return b.toObject();
  }

  /** Provider: upload final report (base64 PDF/image) or JSON structured data. Pushes to reports[] and transitions to REPORTED. */
  async uploadReport(id: string, user: any, body: { name?: string; mime?: string; base64?: string; url?: string; notes?: string; structuredData?: any[] }) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();
    if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id) throw new ForbiddenException();
    if (!body?.base64 && !body?.url && !body?.structuredData) throw new BadRequestException('report_file_required');
    // State machine: a report can only be uploaded once the sample is in the lab pipeline —
    // never on a fresh/cancelled booking (resurrecting terminal bookings corrupts the lifecycle).
    const reportable = [LabBookingState.RESULT_UPLOADED, LabBookingState.REPORTED];
    if (!reportable.includes(b.state)) {
      throw new BadRequestException(`invalid_transition_${b.state}_to_REPORTED`);
    }
    
    let base64Data = body.base64;
    let mimeType = body.mime || 'application/pdf';
    
    if (body.structuredData && body.structuredData.length > 0) {
      base64Data = await this.pdfService.generateReport(b, body.structuredData);
      base64Data = base64Data.split(',')[1]; // remove data uri prefix
      mimeType = 'application/pdf';
    }

    // Decision 19 (issue 338): the values the lab entered stay on the report, so the result the push opens shows them
    // (GET /lab-results/:id), not only the generated PDF. Rows as provider-app LabDashboard sends them.
    const entries = (Array.isArray(body.structuredData) ? body.structuredData : []).flatMap((raw: unknown) => {
      const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
      const name = typeof row?.analyte === 'string' ? row.analyte.trim().slice(0, 200) : '';
      if (!row || !name) return [];
      const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, 100) : '');
      return [{ name, value: str(row.value), unit: str(row.unit), range: str(row.range), ...(row.isCritical === true ? { flag: 'critical' } : {}) }];
    });
    const report = {
      id: require('uuid').v4(),
      ...(entries.length ? { entries, critical: entries.some((e) => e.flag === 'critical') } : {}),
      name: body.name || `report_${new Date().toISOString().slice(0,10)}.pdf`,
      mime: mimeType,
      base64: base64Data,
      url: body.url,
      notes: body.notes,
      uploaded_at: new Date(),
      uploaded_by: user.id,
    };
    const persist = async () => {
      (b.reports as any[]).push(report);
      if (b.state !== LabBookingState.REPORTED) {
        b.state_history.push({ from: b.state, to: LabBookingState.REPORTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'report_uploaded' });
        b.state = LabBookingState.REPORTED;
      }
      await b.save();
      this.events.emit('lab.report_uploaded', { booking_id: b.id, patient_id: b.patient_id, report_id: report.id, name: report.name, tracking_id: b.tracking_id, critical: report.critical === true });
      return b.toObject();
    };
    if (b.state === LabBookingState.REPORTED) return persist();
    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.REPORTED,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'report_uploaded', mutate: persist,
    });
  }

  /** Admin list ALL bookings (any provider). */
  async adminListAll(filter: { status?: string; insurance_status?: string; location_type?: string; delayed_only?: string; disputed_only?: string; limit?: number }, caller?: any) {
    // Defense-in-depth: service enforces admin even if controller guard is bypassed
    if (caller && !getEffectiveRoles(caller).includes(UserRole.ADMIN) && caller.role !== UserRole.ADMIN) {
      throw new ForbiddenException('admin_only');
    }
    const q: any = {};
    if (filter.status) q.state = filter.status;
    if (filter.insurance_status) q.insurance_status = filter.insurance_status;
    if (filter.location_type) q.location_type = filter.location_type;
    
    if (filter.delayed_only === 'true') {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - 24); // Assuming default SLA 24h for general delay if not computed per test
      q.createdAt = { $lt: hoursAgo };
      q.state = { $nin: [LabBookingState.REPORTED, LabBookingState.CANCELLED] };
    }
    
    return this.bkgModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(Math.min(filter.limit || 200, 500));
  }

  async registerSample(user: any, body: { lab_order_id: string; barcode: string; tests: string[]; notes?: string }) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id: body.lab_order_id });
    if (!b) throw new NotFoundException('lab_order_not_found');
    this.assertBookingOwner(user, b);

    const existing = await this.sampleModel.findOne({ barcode: body.barcode });
    if (existing) throw new BadRequestException('barcode_already_registered');

    const persist = async () => {
      const sample = await this.sampleModel.create({
        id: require('uuid').v4(), lab_order_id: body.lab_order_id, patient_id: b.patient_id,
        barcode: body.barcode, tests: body.tests || [], stage: 'received', assigned_to: user.id, notes: body.notes,
      });
      if (b.state !== LabBookingState.SAMPLE_COLLECTED) {
        b.state_history.push({ from: b.state, to: LabBookingState.SAMPLE_COLLECTED, by_user_id: user.id, by_role: user.role, at: new Date(), note: 'sample_registered' });
        b.state = LabBookingState.SAMPLE_COLLECTED;
        await b.save();
      }
      return sample;
    };
    if (b.state === LabBookingState.SAMPLE_COLLECTED) return persist();
    if (![LabBookingState.CONFIRMED, LabBookingState.IN_TRANSIT, LabBookingState.IN_LAB].includes(b.state)) {
      throw new BadRequestException(`invalid_transition_${b.state}_to_SAMPLE_COLLECTED`);
    }
    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.SAMPLE_COLLECTED,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: 'sample_registered', mutate: persist,
    });
  }

  async updateSampleStage(user: any, sampleId: string, stage: string, notes?: string) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const sample = await this.sampleModel.findOne({ id: sampleId });
    if (!sample) throw new NotFoundException('sample_not_found');

    const b = await this.bkgModel.findOne({ id: sample.lab_order_id });
    if (!b) throw new NotFoundException('lab_order_not_found');
    this.assertBookingOwner(user, b);
    const allowedSampleStages: Record<string, string[]> = {
      received: ['analyzing'], analyzing: ['result_ready'], result_ready: ['sent'], sent: [],
    };
    if (sample.stage !== stage && !(allowedSampleStages[sample.stage] || []).includes(stage)) {
      throw new BadRequestException(`invalid_sample_transition_${sample.stage}_to_${stage}`);
    }
    const targetBookingState = stage === 'analyzing' ? LabBookingState.PROCESSING
      : stage === 'result_ready' ? LabBookingState.RESULT_UPLOADED : null;
    if (stage === 'sent' && b.state !== LabBookingState.REPORTED) throw new BadRequestException('sample_cannot_be_sent_before_reported');
    const persist = async () => {
      await this.sampleModel.updateOne({ id: sampleId }, { $set: { stage, notes } });
      if (targetBookingState && b.state !== targetBookingState) {
        b.state_history.push({ from: b.state, to: targetBookingState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `sample_stage_${stage}` });
        b.state = targetBookingState;
        await b.save();
      }
      return { ok: true, stage };
    };
    if (!targetBookingState || b.state === targetBookingState) return persist();
    const allowed = (LAB_BOOKING_TRANSITIONS as any)[b.state] || [];
    if (!allowed.includes(targetBookingState)) throw new BadRequestException(`invalid_transition_${b.state}_to_${targetBookingState}`);
    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: targetBookingState,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: `sample_stage_${stage}`, mutate: persist,
    });
  }

  async listSamples(user: any) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    if (getEffectiveRoles(user).includes('admin')) return this.sampleModel.find({}).sort({ createdAt: -1 }).lean();
    const bookings = await this.bkgModel.find({ provider_account_id: user.id }, { id: 1 }).lean();
    const bookingIds = bookings.map((booking: any) => booking.id).filter(Boolean);
    if (!bookingIds.length) return [];
    return this.sampleModel.find({ lab_order_id: { $in: bookingIds } }).sort({ createdAt: -1 }).lean();
  }

  private assertAssignedProviderOrAdmin(user: any, booking: any) {
    if (getEffectiveRoles(user).includes('admin')) return;
    const providerRoles = ['lab', 'hospital'];
    if (providerRoles.some(role => getEffectiveRoles(user).includes(role)) && booking.provider_account_id === user.id) return;
    throw new ForbiddenException('lab_booking_not_owned');
  }

  private assertPatientOrAssignedProvider(user: any, booking: any) {
    if (getEffectiveRoles(user).includes('admin')) return;
    if (booking.patient_id === user.id) return;
    this.assertAssignedProviderOrAdmin(user, booking);
  }

  private assertBookingOwner(user: any, booking: any) {
    if (getEffectiveRoles(user).includes('admin')) return;
    if (!booking.provider_account_id || booking.provider_account_id !== user.id) {
      throw new ForbiddenException('lab_booking_not_owned');
    }
  }

  // --- Admin Catalog CRUD ---
  async createCatalog(user: any, body: any) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const doc = await this.svcModel.create({ ...pick(body, LAB_CATALOG_FIELDS), ...reviewUpdate(body?.medical_review_status, user.id), id: require('uuid').v4() });
    await invalidateCatalogCache(this.redis, 'cache:lab-services:');
    return doc;
  }

  async updateCatalog(user: any, id: string, body: any) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate({ id }, { $set: { ...pick(body, LAB_CATALOG_FIELDS), ...reviewUpdate(body?.medical_review_status, user.id) } }, { new: true });
    if (!updated) throw new NotFoundException();
    await invalidateCatalogCache(this.redis, 'cache:lab-services:');
    return updated;
  }

  /** Admin catalog editor: every item including unpublished ones (the public list only shows approved). */
  async adminCatalog(user: any) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    return this.svcModel.find({ is_deleted: { $ne: true } }, { _id: 0, __v: 0 }).sort({ medical_review_status: 1, popularity: -1, name_ar: 1 }).limit(1000);
  }

  async deleteCatalog(user: any, id: string) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const deleted = await this.svcModel.findOneAndDelete({ id });
    if (!deleted) throw new NotFoundException();
    // Without this a deleted item stays in the patients' cached lists until the TTL runs out.
    await invalidateCatalogCache(this.redis, 'cache:lab-services:');
    return { ok: true };
  }

  /** P6.0: medical-review decision — approve surfaces the item publicly. */
  async approveCatalogItem(user: any, id: string, approve: boolean) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const updated = await this.svcModel.findOneAndUpdate(
      { id: { $eq: id } },
      { $set: reviewUpdate(approve ? 'approved' : 'rejected', user.id) },
      { new: true },
    );
    if (!updated) throw new NotFoundException();
    // Public lists are cached per query: without this an approved item stays hidden until the TTL.
    await invalidateCatalogCache(this.redis, 'cache:lab-services:');
    this.bus.emit({ type: approve ? 'catalog.service_approved' : 'catalog.service_disabled', entity_type: 'service', entity_id: id, actor_account_id: user.id, actor_role: 'admin', meta: { kind: 'lab' } }).catch(() => null);
    return updated;
  }

  async bulkApproveCatalog(user: any, ids: string[], approve: boolean) {
    if (!isAdminUser(user)) throw new ForbiddenException();
    const list = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === 'string' && x).slice(0, 200);
    if (!list.length) throw new BadRequestException('ids_required');
    const results: any[] = [];
    for (const id of list) {
      try {
        await this.approveCatalogItem(user, id, approve);
        results.push({ id, ok: true });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message || 'failed' });
      }
    }
    return { ok: true, approve, results };
  }

  // --- Admin Quality Control & Dispute Intervention ---
  async adminForceState(user: any, id: string, targetState: LabBookingState, note: string) {
    if (user.role !== 'admin') throw new ForbiddenException('admin_only');
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException();

    b.state_history.push({ from: b.state, to: targetState, by_user_id: user.id, by_role: user.role, at: new Date(), note: `admin_forced: ${note}` });
    b.state = targetState;
    await b.save();
    return b;
  }

  // --- Addendum Backend Logic ---
  async rescheduleBooking(id: string, user: any, body: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
    this.assertPatientOrAssignedProvider(user, b);
    b.scheduled_at = new Date(body.new_date);
    b.reschedule_reason = body.reason;
    b.state_history.push({ from: b.state, to: b.state, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Rescheduled to ${b.scheduled_at}. Reason: ${body.reason}` });
    await b.save();
    return b;
  }

  async updateGps(id: string, user: any, body: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
    this.assertAssignedProviderOrAdmin(user, b);
    // R7-3: GPS must come from the real device — reject missing/zero coordinates.
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      throw new BadRequestException('real_device_location_required');
    }
    b.gps_location = {
      lat, lng,
      eta: body.eta || 0,
      distance: body.distance || 0
    };
    await b.save();
    return { ok: true, gps: b.gps_location };
  }

  async getTracking(id: string, user: any) {
    const b: any = await this.bkgModel.findOne({ id }).lean();
    if (!b) throw new NotFoundException('Booking not found');
    this.assertPatientOrAssignedProvider(user, b);

    // Decision B8 (2026-10-15): the steps are the booking's real status timeline (the app names each state),
    // and the preparation is each test's own catalogue text; nothing is fixed or invented here.
    const timeline = (Array.isArray(b.state_history) ? b.state_history : [])
      .filter((h: any) => h && h.to && h.to !== h.from)
      .map((h: any) => ({ state: String(h.to), at: h.at ? new Date(h.at).toISOString() : null }));

    const serviceIds = (Array.isArray(b.items) ? b.items : []).map((i: any) => i?.service_id).filter(Boolean);
    const services: any[] = serviceIds.length
      ? await this.svcModel.find({ id: { $in: serviceIds } }, { _id: 0, id: 1, name_ar: 1, name_en: 1, ...Object.fromEntries(PREPARATION_LANGS.map((l) => [`preparation_${l}`, 1])) }).lean()
      : [];
    const preparation = services.flatMap((svc: any) => {
      const texts = Object.fromEntries(PREPARATION_LANGS
        .map((l) => [l, (Array.isArray(svc[`preparation_${l}`]) ? svc[`preparation_${l}`] : []).filter((x: unknown) => typeof x === 'string' && x.trim())])
        .filter(([, list]) => (list as string[]).length > 0));
      return Object.keys(texts).length ? [{ service_id: svc.id, name_ar: svc.name_ar, name_en: svc.name_en, texts }] : [];
    });

    // The technician's own name and phone (the account), never the raw id.
    let tech: any = null;
    if (b.technician_id) {
      tech = await this.bkgModel.db.collection('users').findOne({ id: b.technician_id }, { projection: { _id: 0, full_name: 1, name: 1, phone: 1 } }).catch(() => null);
    }
    const eta = Number(b.gps_location?.eta);
    return {
      state: b.state,
      timeline,
      preparation,
      eta: Number.isFinite(eta) && eta > 0 ? eta : null,
      distance: Number.isFinite(Number(b.gps_location?.distance)) ? Number(b.gps_location.distance) : null,
      techName: tech?.full_name || tech?.name || null,
      techPhone: tech?.phone || null,
    };
  }

  async declareEmergency(id: string, user: any, body: any) {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
    this.assertPatientOrAssignedProvider(user, b);
    if ([LabBookingState.REPORTED, LabBookingState.CANCELLED].includes(b.state)) {
      throw new BadRequestException('booking_already_closed');
    }
    // Emergency cancels the visit; through the workflow engine like every other cancellation.
    return this.engine.apply({
      kind: 'lab', entity_id: b.id, from_domain: b.state, to_domain: LabBookingState.CANCELLED,
      actor_account_id: user.id, actor_role: user.role, patient_account_id: b.patient_id, reason: `emergency: ${body.reason || ''}`,
      mutate: async () => {
        b.emergency_reason = body.reason;
        b.state_history.push({ from: b.state, to: LabBookingState.CANCELLED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `Emergency declared: ${body.reason}` });
        b.state = LabBookingState.CANCELLED;
        await b.save();
        this.events.emit('lab.booking_state_changed', { booking_id: b.id, patient_id: b.patient_id, state: b.state, tracking_id: b.tracking_id });
        return b.toObject();
      },
    });
  }

  /** Provider: cancel current technician assignment and return the booking to the CONFIRMED pool for reassignment. */
  async reassign(id: string, user: any) {
    if (!getEffectiveRoles(user).some(role => ['admin', 'lab', 'hospital'].includes(role))) throw new ForbiddenException();
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Booking not found');
    if (user.role !== 'admin' && b.provider_account_id && b.provider_account_id !== user.id) throw new ForbiddenException();
    if ([LabBookingState.CANCELLED, LabBookingState.REPORTED].includes(b.state)) {
      throw new BadRequestException('booking_already_closed');
    }
    // Returning to CONFIRMED is only meaningful before the sample is taken; later it would rewind the lifecycle.
    if (![LabBookingState.CONFIRMED, LabBookingState.IN_TRANSIT].includes(b.state)) {
      throw new BadRequestException(`cannot_reassign_in_${b.state}`);
    }
    const prevTech = b.technician_id || null;
    b.technician_id = undefined as any;
    b.state_history.push({ from: b.state, to: LabBookingState.CONFIRMED, by_user_id: user.id, by_role: user.role, at: new Date(), note: `reassigned: technician ${prevTech || 'none'} unassigned, returned to pool` });
    b.state = LabBookingState.CONFIRMED;
    await b.save();
    this.events.emit('lab.booking_reassigned', { booking_id: b.id, patient_id: b.patient_id, previous_technician_id: prevTech });
    return b.toObject();
  }



  async slotsForProvider(providerAccountId: string, dateStr: string, duration_minutes = 30) {
    // Validate duration: must be integer between 10 and 120
    const duration = parseInt(String(duration_minutes), 10);
    if (!Number.isInteger(duration) || duration < 10 || duration > 120) {
      throw new BadRequestException('duration must be an integer between 10 and 120 minutes');
    }

    const profile = await this.providerProfiles.findOne({
      account_id: providerAccountId,
      type: { $in: ['lab', 'hospital'] },
      status: 'active',
      public_eligibility: true,
      medical_review_status: 'approved',
    }).lean();
    if (!profile) throw new NotFoundException('provider_not_found');
    if (!profile.schedule_lab || !profile.schedule_lab.length) {
      return { date: dateStr, slots: [], reason: 'no_schedule' };
    }

    const date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) return { date: dateStr, slots: [], reason: 'invalid_date' };

    const dow = date.getUTCDay();
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const fullDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const dayMatches = (d: any) => {
      const v = String(d ?? '').toLowerCase();
      return v === 'all' || v === String(dow) || v === dayKeys[dow] || v === fullDays[dow];
    };

    const windows = (profile.schedule_lab || []).filter((w) => w && !w.closed && dayMatches(w.day)).flatMap((w) => [
      ...(w.open && w.close ? [{ open: w.open, close: w.close }] : []),
      ...(w.open_evening && w.close_evening ? [{ open: w.open_evening, close: w.close_evening }] : []),
    ]);

    if (!windows.length) return { date: dateStr, slots: [], reason: 'closed' };

    const baseDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const slots: { id: string; start: string; end: string; label: string; available: boolean }[] = [];
    const seen = new Set<string>();
    const now = Date.now();

    for (const w of windows) {
      const [oh, om] = w.open.split(':').map(Number);
      const [ch, cm] = w.close.split(':').map(Number);
      const openTs = new Date(baseDate.getTime() + oh * 3600_000 + om * 60_000);
      let closeTs = new Date(baseDate.getTime() + ch * 3600_000 + cm * 60_000);
      if (closeTs.getTime() <= openTs.getTime()) closeTs = new Date(closeTs.getTime() + 24 * 3600_000);
      for (let t = openTs.getTime(); t + duration * 60_000 <= closeTs.getTime(); t += duration * 60_000) {
        const start = new Date(t);
        const end = new Date(t + duration * 60_000);
        if (start.getTime() < now + 15 * 60_000) continue;
        const slotId = start.toISOString();
        if (seen.has(slotId)) continue;
        seen.add(slotId);
        slots.push({ id: slotId, start: slotId, end: end.toISOString(), label: slotId.substring(11, 16), available: true });
      }
    }
    slots.sort((x, y) => x.start.localeCompare(y.start));
    if (slots.length === 0) return { date: dateStr, slots: [], reason: 'no_slots' };

    // Mark booked slots as unavailable
    const startOfDay = new Date(baseDate.getTime());
    const endOfDay = new Date(baseDate.getTime() + 24 * 3600_000);
    const booked = await this.bkgModel.find({
      provider_account_id: providerAccountId,
      scheduled_at: { $gte: startOfDay, $lt: endOfDay },
      state: { $nin: ['CANCELLED', 'REPORTED'] },
    }).select({ scheduled_at: 1 }).lean();
    const bookedSet = new Set(booked.map((b: any) => new Date(b.scheduled_at).toISOString()));
    for (const s of slots) {
      if (bookedSet.has(s.start)) s.available = false;
    }
    return { date: dateStr, slots };
  }

}
