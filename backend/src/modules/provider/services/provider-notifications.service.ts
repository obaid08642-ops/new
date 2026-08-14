import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderNotification, ProviderNotificationType } from '../schemas/requests.schema';
import { ProviderNotificationRepository } from "./repositories/providernotification.repository";

function assertProvider(user: any) {
  if (!user || user.role !== 'provider') throw new ForbiddenException('provider scope required');
  return user;
}

@Injectable()
export class ProviderNotificationsService {
  constructor(@Inject('ProviderNotificationRepository') private notifs: ProviderNotificationRepository) {}

  async list(user: any, q: { unread_only?: string; limit?: string; offset?: string }) {
    assertProvider(user);
    const filter: any = { provider_account_id: user.id };
    if (q.unread_only === 'true' || q.unread_only === '1') filter.read = false;
    const limit = Math.min(parseInt(q.limit || '50', 10) || 50, 200);
    const offset = parseInt(q.offset || '0', 10) || 0;
    const items = await this.notifs.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    const total = await this.notifs.countDocuments(filter);
    const unread_count = await this.notifs.countDocuments({ provider_account_id: user.id, read: false });
    return { items, total, unread_count, limit, offset };
  }

  async markRead(user: any, id: string) {
    assertProvider(user);
    const n = await this.notifs.findOne({ id, provider_account_id: user.id });
    if (!n) throw new NotFoundException('notification not found');
    if (!n.read) { n.read = true; n.read_at = new Date(); await n.save(); }
    return { ok: true };
  }

  async markAllRead(user: any) {
    assertProvider(user);
    await this.notifs.updateMany({ provider_account_id: user.id, read: false }, { $set: { read: true, read_at: new Date() } });
    return { ok: true };
  }

  // System creator (called by other services)
  async createSystem(provider_account_id: string, input: {
    type: ProviderNotificationType;
    title_ar: string;
    title_en: string;
    body_ar?: string;
    body_en?: string;
    icon?: string;
    related_id?: string;
    related_type?: string;
  }) {
    return this.notifs.create({ provider_account_id, ...input });
  }
}
