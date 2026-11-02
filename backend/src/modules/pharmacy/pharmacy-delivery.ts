import { BadRequestException, Body, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Permission, RequirePermissions } from '../../common/permissions';
import { recordAudit } from '../../common/audit-record';
import { haversineM } from '../geo/geo-math';

/**
 * Owner decision 2026-11-02: some pharmacies deliver with their own couriers. They say so (own_delivery.enabled), give a zone (a
 * radius around the pharmacy or a set of districts), their own fee (0 allowed) and an optional free-delivery threshold.
 * A pharmacy with its own couriers receives delivery orders only inside its zone; every other pharmacy keeps the distance rules
 * and the platform delivers. The offer carries the mode (`pharmacy_own` | `platform`) and the fee the patient pays.
 */
export type DeliveryMode = 'pharmacy_own' | 'platform';
export type OwnDelivery = {
  enabled: boolean;
  zone_type: 'radius' | 'districts';
  radius_km: number | null;
  district_codes: string[];
  fee_sar: number;
  free_over_sar: number | null;
};

export const MAX_ZONE_RADIUS_KM = 100;
export const MAX_ZONE_DISTRICTS = 100;
export const MAX_OWN_FEE_SAR = 500;
export const MAX_FREE_OVER_SAR = 10000;

const money = (n: number) => Math.round(n * 100) / 100;

export class OwnDeliveryDto {
  @IsBoolean() enabled!: boolean;

  @IsOptional() @IsIn(['radius', 'districts']) zone_type?: 'radius' | 'districts';

  @IsOptional() @IsNumber() @Min(0.5) @Max(MAX_ZONE_RADIUS_KM) radius_km?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(MAX_ZONE_DISTRICTS) @IsString({ each: true }) district_codes?: string[];

  @IsOptional() @IsNumber() @Min(0) @Max(MAX_OWN_FEE_SAR) fee_sar?: number;

  /** null / absent = no free-delivery threshold. */
  @IsOptional() @IsNumber() @Min(0) @Max(MAX_FREE_OVER_SAR) free_over_sar?: number | null;
}

export class OwnDeliveryBodyDto {
  @ValidateNested() @Type(() => OwnDeliveryDto) own_delivery!: OwnDeliveryDto;
}

/** Validate and normalise what a client sent. Throws a typed 400 for a combination that cannot work. */
export function normalizeOwnDelivery(input: unknown): OwnDelivery {
  const b: any = input && typeof input === 'object' ? input : {};
  const enabled = b.enabled === true;
  if (!enabled) return { enabled: false, zone_type: 'radius', radius_km: null, district_codes: [], fee_sar: 0, free_over_sar: null };
  const zoneType = b.zone_type === 'districts' ? 'districts' : 'radius';
  let radius: number | null = null;
  let districts: string[] = [];
  if (zoneType === 'radius') {
    const r = Number(b.radius_km);
    if (!Number.isFinite(r) || r < 0.5 || r > MAX_ZONE_RADIUS_KM) throw new BadRequestException('own_delivery_radius_required');
    radius = Math.round(r * 10) / 10;
  } else {
    districts = [...new Set((Array.isArray(b.district_codes) ? b.district_codes : []).map((d: unknown) => String(d ?? '').trim()).filter(Boolean))] as string[];
    if (!districts.length) throw new BadRequestException('own_delivery_districts_required');
    if (districts.length > MAX_ZONE_DISTRICTS) throw new BadRequestException('own_delivery_too_many_districts');
  }
  const fee = Number(b.fee_sar ?? 0);
  if (!Number.isFinite(fee) || fee < 0 || fee > MAX_OWN_FEE_SAR) throw new BadRequestException('own_delivery_fee_invalid');
  let freeOver: number | null = null;
  if (b.free_over_sar !== undefined && b.free_over_sar !== null) {
    const f = Number(b.free_over_sar);
    if (!Number.isFinite(f) || f < 0 || f > MAX_FREE_OVER_SAR) throw new BadRequestException('own_delivery_free_over_invalid');
    freeOver = money(f);
  }
  return { enabled: true, zone_type: zoneType, radius_km: radius, district_codes: districts, fee_sar: money(fee), free_over_sar: freeOver };
}

/** The stored config of a profile, or null when the pharmacy has no own couriers. */
export function ownDeliveryOf(profile: any): OwnDelivery | null {
  const od = profile?.own_delivery;
  return od && od.enabled === true ? (od as OwnDelivery) : null;
}

/** Whether the pharmacy's own zone covers an order. District codes compare case-insensitively; a radius needs both locations. */
export function ownZoneCovers(od: OwnDelivery, pharmacyGeo: any, orderGeo: any, orderDistrict: unknown): boolean {
  if (od.zone_type === 'districts') {
    const d = String(orderDistrict ?? '').trim().toLowerCase();
    return !!d && od.district_codes.some((c) => String(c).toLowerCase() === d);
  }
  const ok = (g: any) => g && Number.isFinite(Number(g.lat)) && Number.isFinite(Number(g.lng));
  if (!ok(pharmacyGeo) || !ok(orderGeo) || !(Number(od.radius_km) > 0)) return false;
  const km = haversineM({ lat: Number(pharmacyGeo.lat), lng: Number(pharmacyGeo.lng) }, { lat: Number(orderGeo.lat), lng: Number(orderGeo.lng) }) / 1000;
  return km <= Number(od.radius_km);
}

/** Delivery mode and the fee the patient pays for one offer. Pickup has no delivery. The platform fee comes from the caller (pricing config). */
export function deliveryTerms(profile: any, subtotal: number, pickup: boolean, platformFee: number): { mode: DeliveryMode | null; fee: number; source: string } {
  const od = ownDeliveryOf(profile);
  // Pickup has no courier. A pharmacy with its own couriers charges no delivery fee for it; the platform fee rule for pickup
  // is unchanged (F's), only the mode is empty.
  if (pickup) return od ? { mode: null, fee: 0, source: 'pickup' } : { mode: null, fee: money(platformFee), source: platformFee > 0 ? 'platform_pricing_config' : 'no_active_server_delivery_policy' };
  if (!od) return { mode: 'platform', fee: money(platformFee), source: platformFee > 0 ? 'platform_pricing_config' : 'no_active_server_delivery_policy' };
  if (od.free_over_sar != null && subtotal >= od.free_over_sar) return { mode: 'pharmacy_own', fee: 0, source: 'pharmacy' };
  return { mode: 'pharmacy_own', fee: money(od.fee_sar), source: 'pharmacy' };
}

/** The legacy profile fields other code still reads, kept in step with the config. */
export function legacyFields(od: OwnDelivery): Record<string, unknown> {
  return {
    has_own_delivery: od.enabled,
    has_own_drivers: od.enabled,
    delivery_mode: od.enabled ? 'self_delivery' : 'external_delivery_required',
    ...(od.enabled ? { delivery_fee: od.fee_sar, free_delivery_above: od.free_over_sar ?? undefined } : {}),
    ...(od.enabled && od.zone_type === 'radius' ? { delivery_radius_km: od.radius_km, max_delivery_radius_km: od.radius_km } : {}),
  };
}

@Injectable()
export class PharmacyDeliveryService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async get(accountId: string): Promise<{ own_delivery: OwnDelivery }> {
    const p: any = await this.conn.collection('provider_profiles').findOne({ account_id: { $eq: accountId }, provider_type: 'pharmacy' }, { projection: { _id: 0, own_delivery: 1 } });
    if (!p) throw new NotFoundException('pharmacy_profile_not_found');
    return { own_delivery: p.own_delivery ? (p.own_delivery as OwnDelivery) : normalizeOwnDelivery({ enabled: false }) };
  }

  async set(accountId: string, input: unknown, actor: { id?: string; role?: string }): Promise<{ own_delivery: OwnDelivery }> {
    const od = normalizeOwnDelivery(input);
    const set: Record<string, unknown> = { own_delivery: od, ...legacyFields(od), updatedAt: new Date() };
    const unset: Record<string, ''> = od.enabled ? {} : { free_delivery_above: '' };
    const r: any = await this.conn.collection('provider_profiles').updateOne(
      { account_id: { $eq: accountId }, provider_type: 'pharmacy' },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    );
    if (!(r?.matchedCount > 0)) throw new NotFoundException('pharmacy_profile_not_found');
    await recordAudit(this.conn, { action: 'pharmacy.own_delivery.set', user_id: actor.id, role: actor.role, resource_kind: 'provider', resource_id: accountId, details: { enabled: od.enabled, zone_type: od.zone_type, fee_sar: od.fee_sar } });
    return { own_delivery: od };
  }
}

@Controller('provider/pharmacy/delivery-settings')
@Roles(UserRole.PHARMACY)
@UseGuards(JwtAuthGuard)
export class ProviderPharmacyDeliveryController {
  constructor(private readonly svc: PharmacyDeliveryService) {}
  @Get() get(@CurrentUser() u: any) { if (!u?.id) throw new ForbiddenException('provider_identity_required'); return this.svc.get(u.id); }
  @Put() put(@CurrentUser() u: any, @Body() b: OwnDeliveryBodyDto) { if (!u?.id) throw new ForbiddenException('provider_identity_required'); return this.svc.set(u.id, b.own_delivery, u); }
}

@Controller('admin/pharmacy/delivery-settings')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class AdminPharmacyDeliveryController {
  constructor(private readonly svc: PharmacyDeliveryService) {}
  @RequirePermissions(Permission.FACILITY_READ)
  @Get(':accountId') get(@Param('accountId') id: string) { return this.svc.get(id); }
  @RequirePermissions(Permission.FACILITY_EDIT)
  @Put(':accountId') put(@CurrentUser() u: any, @Param('accountId') id: string, @Body() b: OwnDeliveryBodyDto) { return this.svc.set(id, b.own_delivery, u); }
}
