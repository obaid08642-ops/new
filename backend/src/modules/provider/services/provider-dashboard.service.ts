// @ts-nocheck
import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderRequest, ProviderRequestStatus, ProviderAvailability, ProviderAvailabilityStatus } from '../schemas/requests.schema';
import { ProviderAccount, ProviderProfile } from '../schemas';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAvailabilityRepository } from "./repositories/provideravailability.repository";
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";

function assertProvider(user: any) {
  if (!user || user.role !== 'provider') throw new ForbiddenException('provider scope required');
  return user;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

@Injectable()
export class ProviderDashboardService {
  constructor(
    @Inject('ProviderRequestRepository') private requests: ProviderRequestRepository,
    @Inject('ProviderAvailabilityRepository') private avails: ProviderAvailabilityRepository,
    @Inject('ProviderAccountRepository') private accounts: ProviderAccountRepository,
    @Inject('ProviderAccountProfileRepository') private profiles: ProviderAccountProfileRepository,
  ) {}

  async stats(user: any) {
    assertProvider(user);
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const base = { account_id: user.id };

    const [today_total, pending, completed_today, today_revenue_agg, accepted_all, in_progress] = await Promise.all([
      this.requests.countDocuments({ ...base, createdAt: { $gte: todayStart, $lte: todayEnd } }),
      this.requests.countDocuments({ ...base, status: ProviderRequestStatus.PENDING }),
      this.requests.countDocuments({ ...base, status: ProviderRequestStatus.COMPLETED, completed_at: { $gte: todayStart, $lte: todayEnd } }),
      this.requests.aggregate([
        { $match: { account_id: user.id, status: ProviderRequestStatus.COMPLETED, completed_at: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount_total' } } },
      ]),
      this.requests.countDocuments({ ...base, status: ProviderRequestStatus.ACCEPTED }),
      this.requests.countDocuments({ ...base, status: ProviderRequestStatus.IN_PROGRESS }),
    ]);

    const today_revenue = (today_revenue_agg[0]?.total) || 0;

    return {
      today_requests: today_total,
      pending_requests: pending,
      completed_today,
      in_progress,
      accepted_total: accepted_all,
      today_revenue,
      currency: 'SAR',
    };
  }

  async recentRequests(user: any, limit = 3) {
    assertProvider(user);
    const items = await this.requests.find({ account_id: user.id })
      .sort({ createdAt: -1 }).limit(limit).lean();
    return { items };
  }

  async getAvailability(user: any) {
    assertProvider(user);
    let a = await this.avails.findOne({ account_id: user.id });
    if (!a) {
      a = await this.avails.create({ account_id: user.id, status: ProviderAvailabilityStatus.OFFLINE });
    }
    return { status: a.status, last_online_at: a.last_online_at, last_offline_at: a.last_offline_at, note: a.note };
  }

  async setAvailability(user: any, body: { status: ProviderAvailabilityStatus; note?: string }) {
    assertProvider(user);
    if (!Object.values(ProviderAvailabilityStatus).includes(body.status)) {
      throw new NotFoundException('invalid availability status');
    }
    const a = await this.avails.findOneAndUpdate(
      { account_id: user.id },
      {
        $set: {
          status: body.status,
          note: body.note,
          ...(body.status === ProviderAvailabilityStatus.ONLINE || body.status === ProviderAvailabilityStatus.ACCEPTING_ORDERS ? { last_online_at: new Date() } : {}),
          ...(body.status === ProviderAvailabilityStatus.OFFLINE ? { last_offline_at: new Date() } : {}),
        },
      },
      { upsert: true, new: true },
    );
    return { status: a.status, last_online_at: a.last_online_at, last_offline_at: a.last_offline_at, note: a.note };
  }

  async me(user: any) {
    assertProvider(user);
    const a = await this.accounts.findOne({ id: user.id });
    if (!a) throw new NotFoundException();
    const p = await this.profiles.findOne({ account_id: a.id });
    const av = await this.getAvailability(user);
    return {
      account: { id: a.id, email: a.email, provider_type: a.provider_type, status: a.status, email_verified: a.email_verified, approved_at: a.approved_at },
      profile: p?.toObject() || null,
      availability: av,
    };
  }
}
