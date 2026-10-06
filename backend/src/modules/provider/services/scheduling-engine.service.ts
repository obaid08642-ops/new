import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderScheduleSlot } from '../schemas/capabilities.schema';
import { ProviderRequest, ProviderRequestStatus } from '../schemas/requests.schema';
import { ProviderScheduleSlotRepository } from "./repositories/providerscheduleslot.repository";
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { isProviderRole } from '../../../common/enums';
import { ProviderProfileService } from './provider-profile.service';

function assertProvider(user: any) {
  if (!user || !isProviderRole(user.role)) throw new ForbiddenException('provider scope required');
  return user;
}

function parseHHMM(s: string): number {
  if (!/^\d{2}:\d{2}$/.test(s)) return -1;
  const [h, m] = s.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

@Injectable()
export class SchedulingEngineService {
  constructor(
    @Inject('ProviderScheduleSlotRepository') private slots: ProviderScheduleSlotRepository,
    @Inject('ProviderRequestRepository') private requests: ProviderRequestRepository,
    private readonly profileService: ProviderProfileService,
  ) {}

  // ---------- CRUD ----------
  async listSlots(user: any) {
    assertProvider(user);
    return this.slots.find({ provider_account_id: user.id }).sort({ day_of_week: 1, start_time: 1 }).lean();
  }

  async upsertSlot(user: any, body: any) {
    assertProvider(user);
    const dow = body?.day_of_week;
    if (dow == null || dow < 0 || dow > 6) throw new BadRequestException('day_of_week (0-6) is required');
    const s = parseHHMM(body.start_time);
    const e = parseHHMM(body.end_time);
    if (s < 0 || e < 0 || e <= s) throw new BadRequestException('invalid start_time/end_time (HH:MM, end > start)');
    const serviceType = typeof body?.service_type === 'string' && body.service_type ? body.service_type : 'all';
    if (!['all', 'clinic', 'video', 'voice', 'home'].includes(serviceType)) throw new BadRequestException('invalid service_type (all|clinic|video|voice|home)');
    const payload = { ...body, service_type: serviceType, provider_account_id: user.id };
    // Governance: slot changes stay draft until admin approves; live matching untouched.
    if (body.id) {
      const existing = await this.slots.findOne({ id: body.id, provider_account_id: user.id }).lean();
      if (!existing) throw new NotFoundException();
      return this.profileService.requestChange(user, 'slots', { operation: 'update', filter: { id: body.id, provider_account_id: user.id }, payload });
    }
    return this.profileService.requestChange(user, 'slots', { operation: 'create', filter: null, payload });
  }

  async deleteSlot(user: any, id: string) {
    assertProvider(user);
    const r = await this.slots.findOne({ id, provider_account_id: user.id }).lean();
    if (!r) throw new NotFoundException();
    return this.profileService.requestChange(user, 'slots', { operation: 'delete', filter: { id, provider_account_id: user.id }, payload: null });
  }

  // ---------- CONFLICT / AVAILABILITY ----------
  /**
   * Checks whether the provider can take a new booking at `desiredAt` lasting `duration_minutes`.
   * Rules:
   *  - There must be an active weekly slot covering the time range on that day_of_week.
   *  - Existing accepted/in_progress requests in the same window must not exceed `capacity_per_slot`.
   */
  async checkAvailability(provider_account_id: string, desiredAt: Date, duration_minutes: number = 30, service_type: string = 'all') {
    const d = new Date(desiredAt);
    const dow = d.getDay();
    const startMin = d.getHours() * 60 + d.getMinutes();
    const endMin = startMin + duration_minutes;
    const slot = await this.slots.findOne({
      provider_account_id, day_of_week: dow, active: true,
      $or: [{ service_type: 'all' }, { service_type }, { service_type: { $exists: false } }],
    }).lean();
    if (!slot) return { available: false, reason: 'no_weekly_slot_for_day', day_of_week: dow };
    const sStart = parseHHMM((slot as any).start_time);
    const sEnd = parseHHMM((slot as any).end_time);
    if (startMin < sStart || endMin > sEnd) {
      return { available: false, reason: 'outside_working_hours', slot };
    }
    // Conflict check: existing accepted/in_progress overlap
    const winStart = new Date(d.getTime() - duration_minutes * 60 * 1000);
    const winEnd = new Date(d.getTime() + duration_minutes * 60 * 1000);
    const overlapping = await this.requests.countDocuments({
      provider_account_id,
      status: { $in: [ProviderRequestStatus.ACCEPTED, ProviderRequestStatus.IN_PROGRESS] },
      scheduled_at: { $gte: winStart, $lte: winEnd },
    });
    const capacity = (slot as any).capacity_per_slot || 1;
    if (overlapping >= capacity) {
      return { available: false, reason: 'capacity_full', current_load: overlapping, capacity };
    }
    return { available: true, slot, current_load: overlapping, capacity };
  }

  /**
   * Compute current workload (count of accepted + in_progress) for ranking.
   */
  async getWorkload(provider_account_id: string): Promise<number> {
    return this.requests.countDocuments({
      provider_account_id,
      status: { $in: [ProviderRequestStatus.ACCEPTED, ProviderRequestStatus.IN_PROGRESS] },
    });
  }

  /** Quick capacity flag: does provider have ANY active slot covering NOW? */
  async isOnDuty(provider_account_id: string, at: Date = new Date(), service_type: string = 'all') {
    const dow = at.getDay();
    const minutes = at.getHours() * 60 + at.getMinutes();
    const slot = await this.slots.findOne({
      provider_account_id, day_of_week: dow, active: true,
      $or: [{ service_type: 'all' }, { service_type }, { service_type: { $exists: false } }],
    }).lean();
    if (!slot) return false;
    const s = parseHHMM((slot as any).start_time);
    const e = parseHHMM((slot as any).end_time);
    return minutes >= s && minutes <= e;
  }
}
