import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CreateServiceAreaDto, UpdateServiceAreaDto, isLaunchableService } from './city-ops.dto';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Ray-casting point-in-polygon (pure). */
export function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function validatePolygon(polygon: GeoPoint[]): void {
  if (!Array.isArray(polygon) || polygon.length < 3) throw new BadRequestException('polygon_min_3_points');
  const seen = new Set(polygon.map((p) => `${p.lat},${p.lng}`));
  if (seen.size < 3) throw new BadRequestException('polygon_degenerate');
  for (const p of polygon) {
    if (!Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90) throw new BadRequestException('polygon_bad_lat');
    if (!Number.isFinite(p.lng) || p.lng < -180 || p.lng > 180) throw new BadRequestException('polygon_bad_lng');
  }
}

export function validateZoneRules(rules: Record<string, unknown> | undefined): void {
  if (!rules) return;
  if (rules['maxDistanceKm'] !== undefined && !(Number(rules['maxDistanceKm']) > 0)) {
    throw new BadRequestException('zone_max_distance_positive');
  }
  if (rules['capacityPerDay'] !== undefined && !(Number(rules['capacityPerDay']) >= 0)) {
    throw new BadRequestException('zone_capacity_non_negative');
  }
  if (rules['allowedServices'] !== undefined) {
    if (!Array.isArray(rules['allowedServices'])) throw new BadRequestException('zone_services_array');
    for (const s of rules['allowedServices'] as unknown[]) {
      if (!isLaunchableService(String(s))) throw new BadRequestException(`zone_unknown_service:${String(s)}`);
    }
  }
}

/**
 * P22.16 — service-area management (areas with geometry/zone rules).
 * Collection: service_areas (owned by the location module).
 */
@Injectable()
export class ServiceAreaService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  async create(dto: CreateServiceAreaDto): Promise<Record<string, unknown>> {
    validatePolygon(dto.polygon as GeoPoint[]);
    validateZoneRules(dto.zoneRules as unknown as Record<string, unknown> | undefined);
    const dup = await this.conn
      .collection('service_areas')
      .findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (dup) {
      const { _id, ...rest } = dup as unknown as Record<string, unknown>;
      void _id;
      return rest;
    }
    const code = String(dto.code).trim();
    const exists = await this.conn.collection('service_areas').findOne({ code: { $eq: code } });
    if (exists) throw new BadRequestException('area_code_exists');
    const city = await this.conn
      .collection('locations')
      .findOne({ code: { $eq: String(dto.cityCode) }, type: { $eq: 'city' } });
    if (!city) throw new BadRequestException('city_not_found');
    const doc = {
      id: this.newId('sa'),
      code,
      name_ar: String(dto.nameAr),
      name_en: String(dto.nameEn),
      city_code: String(dto.cityCode),
      polygon: (dto.polygon as GeoPoint[]).map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })),
      zone_rules: dto.zoneRules
        ? {
            maxDistanceKm: dto.zoneRules.maxDistanceKm ?? null,
            capacityPerDay: dto.zoneRules.capacityPerDay ?? null,
            allowedServices: dto.zoneRules.allowedServices ? [...dto.zoneRules.allowedServices] : [],
          }
        : { maxDistanceKm: null, capacityPerDay: null, allowedServices: [] },
      active: dto.active !== false,
      idempotencyKey: String(dto.idempotencyKey),
      createdAt: new Date(),
    };
    await this.conn.collection('service_areas').insertOne(doc as unknown as Record<string, unknown>);
    return doc;
  }

  async list(cityCode?: string): Promise<Array<Record<string, unknown>>> {
    const filter: Record<string, unknown> = {};
    if (cityCode) filter['city_code'] = { $eq: String(cityCode) };
    const rows = await this.conn.collection('service_areas').find(filter).limit(500).toArray();
    return (rows as unknown as Array<Record<string, unknown>>).map((r) => {
      const { _id, ...rest } = r;
      void _id;
      return rest;
    });
  }

  async update(code: string, dto: UpdateServiceAreaDto): Promise<Record<string, unknown>> {
    if (dto.polygon) validatePolygon(dto.polygon as GeoPoint[]);
    if (dto.zoneRules) validateZoneRules(dto.zoneRules as unknown as Record<string, unknown>);
    const flat: Record<string, unknown> = {};
    if (dto.nameAr !== undefined) flat['name_ar'] = String(dto.nameAr);
    if (dto.nameEn !== undefined) flat['name_en'] = String(dto.nameEn);
    if (dto.polygon) flat['polygon'] = (dto.polygon as GeoPoint[]).map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
    if (dto.zoneRules) {
      const cur = (await this.conn.collection('service_areas').findOne({ code: { $eq: String(code) } })) as unknown as Record<
        string,
        unknown
      > | null;
      if (!cur) throw new NotFoundException('area_not_found');
      const zr = { ...((cur['zone_rules'] as Record<string, unknown>) || {}) };
      if (dto.zoneRules.maxDistanceKm !== undefined) zr['maxDistanceKm'] = dto.zoneRules.maxDistanceKm;
      if (dto.zoneRules.capacityPerDay !== undefined) zr['capacityPerDay'] = dto.zoneRules.capacityPerDay;
      if (dto.zoneRules.allowedServices !== undefined) zr['allowedServices'] = [...dto.zoneRules.allowedServices];
      flat['zone_rules'] = zr;
    }
    if (dto.active !== undefined) flat['active'] = dto.active;
    if (Object.keys(flat).length === 0) throw new BadRequestException('nothing_to_update');
    const res = await this.conn
      .collection('service_areas')
      .updateOne({ code: { $eq: String(code) } }, { $set: flat });
    if (res.modifiedCount === 0 && res.upsertedCount === 0) {
      const still = await this.conn.collection('service_areas').findOne({ code: { $eq: String(code) } });
      if (!still) throw new NotFoundException('area_not_found');
    }
    const after = (await this.conn.collection('service_areas').findOne({ code: { $eq: String(code) } })) as unknown as Record<
      string,
      unknown
    >;
    const { _id, ...rest } = after;
    void _id;
    return rest;
  }

  async remove(code: string): Promise<{ ok: boolean }> {
    const providers = await this.conn
      .collection('provider_profiles')
      .countDocuments({ service_area_codes: { $eq: String(code) } } as unknown as Record<string, unknown>)
      .catch(() => 0);
    void providers;
    await this.conn.collection('service_areas').updateOne(
      { code: { $eq: String(code) } },
      { $set: { active: false } },
    );
    return { ok: true };
  }
}
