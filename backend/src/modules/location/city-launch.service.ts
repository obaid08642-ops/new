import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { SetLaunchSwitchDto, isLaunchableService } from './city-ops.dto';

/**
 * P22.16 — city launch switches (per-city feature/service gating).
 * Fail-open default: no row ⇒ launched (preserves current behavior —
 * Location.coverage flags all default true). Explicit rows gate.
 */
@Injectable()
export class CityLaunchService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async setSwitch(dto: SetLaunchSwitchDto): Promise<Record<string, unknown>> {
    if (!isLaunchableService(String(dto.service))) throw new BadRequestException('unknown_service');
    const city = await this.conn
      .collection('locations')
      .findOne({ code: { $eq: String(dto.cityCode) }, type: { $eq: 'city' } });
    if (!city) throw new BadRequestException('city_not_found');
    const dup = await this.conn.collection('city_launches').findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (dup) {
      const { _id, ...rest } = dup as unknown as Record<string, unknown>;
      void _id;
      return rest;
    }
    const doc = {
      id: `cl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      city_code: String(dto.cityCode),
      service: String(dto.service),
      enabled: Boolean(dto.enabled),
      idempotencyKey: String(dto.idempotencyKey),
      updatedAt: new Date(),
    };
    await this.conn.collection('city_launches').updateOne(
      { city_code: { $eq: doc.city_code }, service: { $eq: doc.service } },
      { $set: doc },
      { upsert: true },
    );
    return doc;
  }

  async isLaunched(cityCode: string, service: string): Promise<boolean> {
    if (!isLaunchableService(String(service))) throw new BadRequestException('unknown_service');
    const row = (await this.conn.collection('city_launches').findOne({
      city_code: { $eq: String(cityCode) },
      service: { $eq: String(service) },
    })) as unknown as Record<string, unknown> | null;
    if (!row) return true;
    return Boolean(row['enabled']);
  }

  async forCity(cityCode: string): Promise<Record<string, boolean>> {
    const rows = (await this.conn
      .collection('city_launches')
      .find({ city_code: { $eq: String(cityCode) } })
      .limit(100)
      .toArray()) as unknown as Array<Record<string, unknown>>;
    const out: Record<string, boolean> = {};
    for (const r of rows) out[String(r['service'])] = Boolean(r['enabled']);
    return out;
  }
}
