import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import {
  PharmacyInventoryItem, LabTestCatalogItem, RadiologyServiceCatalogItem,
  DoctorSessionType, HomeCareServiceCatalogItem, ProviderDeliveryZone,
} from '../schemas/capabilities.schema';
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { LabTestCatalogItemRepository } from "./repositories/labtestcatalogitem.repository";
import { RadiologyServiceCatalogItemRepository } from "./repositories/radiologyservicecatalogitem.repository";
import { DoctorSessionTypeRepository } from "./repositories/doctorsessiontype.repository";
import { HomeCareServiceCatalogItemRepository } from "./repositories/homecareservicecatalogitem.repository";
import { ProviderDeliveryZoneRepository } from "./repositories/providerdeliveryzone.repository";

function assertProvider(user: any) {
  if (!user || user.role !== 'provider') throw new ForbiddenException('provider scope required');
  return user;
}

@Injectable()
export class ServiceCapabilityService {
  constructor(
    @Inject('PharmacyInventoryItemRepository') private pharma: PharmacyInventoryItemRepository,
    @Inject('LabTestCatalogItemRepository') private lab: LabTestCatalogItemRepository,
    @Inject('RadiologyServiceCatalogItemRepository') private rad: RadiologyServiceCatalogItemRepository,
    @Inject('DoctorSessionTypeRepository') private doc: DoctorSessionTypeRepository,
    @Inject('HomeCareServiceCatalogItemRepository') private hc: HomeCareServiceCatalogItemRepository,
    @Inject('ProviderDeliveryZoneRepository') private zones: ProviderDeliveryZoneRepository,
  ) {}

  // ---------- PHARMACY INVENTORY ----------
  async listPharmacy(user: any) {
    assertProvider(user);
    return this.pharma.find({ provider_account_id: user.id }).sort({ name_ar: 1 }).lean();
  }
  async upsertPharmacy(user: any, body: any) {
    assertProvider(user);
    if (!body?.sku || !body?.name_ar) throw new BadRequestException('sku and name_ar are required');
    const filter = { provider_account_id: user.id, sku: body.sku };
    const update = { ...body, provider_account_id: user.id };
    const r = await this.pharma.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    return r.toObject();
  }
  async deletePharmacy(user: any, id: string) {
    assertProvider(user);
    const r = await this.pharma.findOneAndDelete({ id, provider_account_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  // ---------- LAB CATALOG ----------
  async listLab(user: any) {
    assertProvider(user);
    return this.lab.find({ provider_account_id: user.id }).sort({ name_ar: 1 }).lean();
  }
  async upsertLab(user: any, body: any) {
    assertProvider(user);
    if (!body?.code || !body?.name_ar) throw new BadRequestException('code and name_ar are required');
    const r = await this.lab.findOneAndUpdate(
      { provider_account_id: user.id, code: body.code },
      { ...body, provider_account_id: user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return r.toObject();
  }
  async deleteLab(user: any, id: string) {
    assertProvider(user);
    const r = await this.lab.findOneAndDelete({ id, provider_account_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  // ---------- RADIOLOGY CATALOG ----------
  async listRadiology(user: any) {
    assertProvider(user);
    return this.rad.find({ provider_account_id: user.id }).sort({ scan_type: 1 }).lean();
  }
  async upsertRadiology(user: any, body: any) {
    assertProvider(user);
    if (!body?.scan_type || !body?.body_part) throw new BadRequestException('scan_type and body_part are required');
    const r = await this.rad.findOneAndUpdate(
      { provider_account_id: user.id, scan_type: body.scan_type, body_part: body.body_part },
      { ...body, provider_account_id: user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return r.toObject();
  }
  async deleteRadiology(user: any, id: string) {
    assertProvider(user);
    const r = await this.rad.findOneAndDelete({ id, provider_account_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  // ---------- DOCTOR SESSION TYPES ----------
  async listDoctorSessions(user: any) {
    assertProvider(user);
    return this.doc.find({ provider_account_id: user.id }).sort({ specialty: 1 }).lean();
  }
  async upsertDoctorSession(user: any, body: any) {
    assertProvider(user);
    if (!body?.consultation_type || !body?.specialty) throw new BadRequestException('consultation_type and specialty are required');
    const r = await this.doc.findOneAndUpdate(
      { provider_account_id: user.id, consultation_type: body.consultation_type, specialty: body.specialty },
      { ...body, provider_account_id: user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return r.toObject();
  }
  async deleteDoctorSession(user: any, id: string) {
    assertProvider(user);
    const r = await this.doc.findOneAndDelete({ id, provider_account_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  // ---------- HOME CARE CATALOG ----------
  async listHomeCare(user: any) {
    assertProvider(user);
    return this.hc.find({ provider_account_id: user.id }).sort({ service_type: 1 }).lean();
  }
  async upsertHomeCare(user: any, body: any) {
    assertProvider(user);
    if (!body?.service_type) throw new BadRequestException('service_type is required');
    const r = await this.hc.findOneAndUpdate(
      { provider_account_id: user.id, service_type: body.service_type },
      { ...body, provider_account_id: user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return r.toObject();
  }
  async deleteHomeCare(user: any, id: string) {
    assertProvider(user);
    const r = await this.hc.findOneAndDelete({ id, provider_account_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  // ---------- DELIVERY ZONES ----------
  async listZones(user: any) {
    assertProvider(user);
    return this.zones.find({ provider_account_id: user.id }).lean();
  }
  async upsertZone(user: any, body: any) {
    assertProvider(user);
    if (!body?.name) throw new BadRequestException('name is required');
    const shape = body.shape || 'circle';
    if (shape === 'circle' && (!body.center || !body.radius_km)) throw new BadRequestException('circle zone requires center and radius_km');
    if (shape === 'polygon' && (!Array.isArray(body.polygon) || body.polygon.length < 3)) throw new BadRequestException('polygon zone requires at least 3 points');
    if (body.id) {
      const updated = await this.zones.findOneAndUpdate(
        { id: body.id, provider_account_id: user.id },
        { ...body, provider_account_id: user.id },
        { new: true },
      );
      if (!updated) throw new NotFoundException();
      return updated.toObject();
    }
    const z = await this.zones.create({ ...body, provider_account_id: user.id });
    return z.toObject();
  }
  async deleteZone(user: any, id: string) {
    assertProvider(user);
    const r = await this.zones.findOneAndDelete({ id, provider_account_id: user.id });
    if (!r) throw new NotFoundException();
    return { ok: true };
  }

  // ---------- INTERNAL HELPERS (used by Matching Engine) ----------
  async hasCapabilityFor(provider_account_id: string, requestType: string, payload: any): Promise<{ ok: boolean; matched_items?: any[]; price?: number }> {
    if (requestType === 'pharmacy') {
      const skus = (payload?.items || []).map((it: any) => it.sku || it.name).filter(Boolean);
      if (skus.length === 0) {
        const any = await this.pharma.exists({ provider_account_id, available: true });
        return { ok: !!any };
      }
      const items = await this.pharma.find({ provider_account_id, available: true, $or: [{ sku: { $in: skus } }, { name_ar: { $in: skus } }] }).lean();
      const total = items.reduce((s, it: any) => s + (it.price || 0), 0);
      return { ok: items.length > 0, matched_items: items, price: total };
    }
    if (requestType === 'lab') {
      const codes = (payload?.tests || []).map((t: any) => t.code || t.name).filter(Boolean);
      if (codes.length === 0) return { ok: !!(await this.lab.exists({ provider_account_id, available: true })) };
      const items = await this.lab.find({ provider_account_id, available: true, $or: [{ code: { $in: codes } }, { name_ar: { $in: codes } }] }).lean();
      const home_required = !!payload?.home_collection;
      const eligible = home_required ? items.filter((i: any) => i.home_collection_supported) : items;
      const total = eligible.reduce((s, it: any) => s + (it.price || 0), 0);
      return { ok: eligible.length >= codes.length * 0.5, matched_items: eligible, price: total };
    }
    if (requestType === 'radiology') {
      const scan = payload?.scan_type;
      const part = payload?.body_part;
      if (!scan) return { ok: !!(await this.rad.exists({ provider_account_id, available: true })) };
      const item = await this.rad.findOne({ provider_account_id, available: true, scan_type: scan, ...(part ? { body_part: part } : {}) }).lean();
      return { ok: !!item, matched_items: item ? [item] : [], price: (item as any)?.price || 0 };
    }
    if (requestType === 'doctor') {
      const type = payload?.consultation_type;
      const filter: any = { provider_account_id, available: true };
      if (type) filter.consultation_type = type;
      const item = await this.doc.findOne(filter).lean();
      return { ok: !!item, matched_items: item ? [item] : [], price: (item as any)?.price || 0 };
    }
    if (requestType === 'home_care') {
      const stype = payload?.service_type;
      const filter: any = { provider_account_id, available: true };
      if (stype) filter.service_type = stype;
      const item = await this.hc.findOne(filter).lean();
      const hours = payload?.duration_hours || (item as any)?.min_hours || 1;
      const price = ((item as any)?.hourly_price || 0) * hours;
      return { ok: !!item, matched_items: item ? [item] : [], price };
    }
    return { ok: false };
  }

  async getZonesFor(provider_account_id: string) {
    return this.zones.find({ provider_account_id, active: true }).lean();
  }
}
