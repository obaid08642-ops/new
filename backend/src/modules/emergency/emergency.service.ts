import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { NotificationPriority, NotificationType } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';

const MAX_SHARES = 5;
const WINDOW_SECONDS = 600;

/** Digits only, with the Saudi 05… / 9665… / +9665… forms folded to one key (last 9 digits). */
const phoneKey = (p: unknown) => String(p ?? '').replace(/\D/g, '').slice(-9);

/**
 * D-14: "send my location to my emergency contacts". Contacts who use the app get an in-app notification
 * with the map link; the others come back as `sms:` links that the patient's own phone sends (the server
 * SMS channel is off by default). Nothing else happens: no emergency request, no dispatch, no admin alert.
 */
@Injectable()
export class EmergencyService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
  ) {}

  async shareLocation(user: any, body: { lat: number; lng: number }) {
    if (!user?.id) throw new UnauthorizedException();
    const { allowed } = await this.redis.checkRateLimit(`emergency:share-location:${user.id}`, MAX_SHARES, WINDOW_SECONDS);
    if (!allowed) throw new HttpException({ code: 'rate_limited', message: 'rate_limited' }, HttpStatus.TOO_MANY_REQUESTS);

    const lat = Math.round(body.lat * 1e6) / 1e6;
    const lng = Math.round(body.lng * 1e6) / 1e6;
    const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
    const [profile, me]: any[] = await Promise.all([
      this.conn.collection('patient_profiles').findOne({ user_id: user.id }, { projection: { _id: 0, emergency_contacts: 1 } }),
      this.conn.collection('users').findOne({ id: user.id }, { projection: { _id: 0, full_name: 1, name: 1 } }),
    ]);
    const name = String(me?.full_name || me?.name || '').trim();
    const contacts: any[] = (Array.isArray(profile?.emergency_contacts) ? profile.emergency_contacts : [])
      .filter((c: any) => phoneKey(c?.phone).length === 9);

    const keys = [...new Set(contacts.map((c) => phoneKey(c.phone)))];
    const appUsers: any[] = keys.length
      ? await this.conn.collection('users').find(
        { id: { $ne: user.id }, phone: { $regex: `(${keys.join('|')})$` } },
        { projection: { _id: 0, id: 1, phone: 1 } },
      ).toArray()
      : [];
    const userByKey = new Map(appUsers.map((u) => [phoneKey(u.phone), u.id]));

    const smsText = `${name ? `${name}: ` : ''}موقعي الآن / My location now: ${mapUrl}`;
    const sms_links: Array<{ name: string; phone: string; href: string }> = [];
    let notified = 0;
    for (const c of contacts) {
      const recipient = userByKey.get(phoneKey(c.phone));
      if (recipient) {
        await this.notifications.create({
          user_id: recipient,
          title_key: 'notif.emergency_location.title',
          body_key: 'notif.emergency_location.body',
          params: { name, lat, lng, map_url: mapUrl },
          type: NotificationType.ALERT,
          priority: NotificationPriority.HIGH,
          action: { type: 'open_url', url: mapUrl },
        });
        notified += 1;
      } else {
        sms_links.push({ name: String(c.name || ''), phone: String(c.phone), href: `sms:${String(c.phone).trim()}?body=${encodeURIComponent(smsText)}` });
      }
    }
    return { map_url: mapUrl, notified, sms_links };
  }
}
