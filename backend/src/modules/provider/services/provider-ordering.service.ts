import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Connection } from 'mongoose';
import { getEffectiveRoles } from '../../../common/auth.guard';
import { recordAudit } from '../../../common/audit-record';
import { CATALOG_COLLECTIONS } from '../../catalogs/catalog-collections';
import { OrderingBulkPriceDto, OrderingCopyModeDto, OrderingImportDto, OrderingItemDto, OrderingSettingsDto } from '../provider-ordering.dto';

// M1 provider item model (docs/product/ORDERING_MODEL_2026-10-16.md, phase M1). A provider's ordering declaration is its own
// commercial data: it takes effect at once and every write is audited. The national catalogue stays admin-governed.

export type ServiceKind = 'lab' | 'radiology' | 'nursing';
export type OrderMode = 'home' | 'facility';
export interface InsurerClasses { company_id: string; classes: string[]; active: boolean }
export interface OrderingSettings {
  modes: OrderMode[];
  home_fee: number;
  home_radius_km: number | null;
  auto_accept: boolean;
  walk_in: boolean;
  staff_genders: string[];
  accepted_insurance: InsurerClasses[];
}
interface ItemDoc {
  provider_account_id: string;
  service_kind: ServiceKind;
  catalog_id: string;
  modes?: OrderMode[] | null;
  prices?: Partial<Record<OrderMode, number>>;
  accepted_insurance?: InsurerClasses[] | null;
  turnaround_hours?: number | null;
  preparation?: { ar?: string; en?: string } | null;
  available?: boolean;
}
interface CatalogDoc { id: string; name_ar?: string; name_en?: string; portable_ultrasound?: boolean }
export interface OrderingItemView {
  service_kind: ServiceKind;
  catalog_id: string;
  name_ar: string | null;
  name_en: string | null;
  modes: OrderMode[];
  prices: Partial<Record<OrderMode, number>>;
  accepted_insurance: InsurerClasses[];
  turnaround_hours: number | null;
  preparation: { ar?: string; en?: string } | null;
  available: boolean;
  inherited: { modes: boolean; accepted_insurance: boolean };
}

const MODES: OrderMode[] = ['home', 'facility'];
const GENDERS = ['female', 'male'];
const KINDS: ServiceKind[] = ['lab', 'radiology', 'nursing'];
const KIND_CATALOG: Record<ServiceKind, string> = {
  lab: CATALOG_COLLECTIONS.lab_services,
  radiology: CATALOG_COLLECTIONS.radiology_services,
  nursing: CATALOG_COLLECTIONS.nursing_services,
};
// Owner weights (SystemConfig `ordering_completeness_weights`); these are the defaults.
const DEFAULT_WEIGHTS = { prices: 40, modes_hours: 20, insurance: 20, prep_turnaround: 10, photo_licence: 10 };
const MAX_HOME_RADIUS_KM = 50;
const SETTINGS = 'provider_ordering_settings';
const ITEMS = 'provider_ordering_items';

const bad = (code: string) => new BadRequestException(code);
const round2 = (n: number) => Math.round(n * 100) / 100;
const isPrice = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** The provider's service kind from its token (lab, radiology or nursing). Null for every other account. */
export function orderingKindOf(user: unknown): ServiceKind | null {
  const roles = getEffectiveRoles(user);
  if (roles.includes('lab')) return 'lab';
  if (roles.includes('radiology')) return 'radiology';
  if (roles.includes('nursing') || roles.includes('nurse')) return 'nursing';
  return null;
}

function defaultSettings(): OrderingSettings {
  return { modes: [], home_fee: 0, home_radius_km: null, auto_accept: false, walk_in: false, staff_genders: [], accepted_insurance: [] };
}

function reasonOf(e: unknown): string {
  const r = (e as { getResponse?: () => unknown })?.getResponse?.();
  if (typeof r === 'string') return r;
  return (r as { message?: string })?.message ?? 'ordering_error';
}

@Injectable()
export class ProviderOrderingService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private settingsCol() { return this.conn.collection(SETTINGS); }
  private itemsCol() { return this.conn.collection(ITEMS); }
  private catalogCol(kind: ServiceKind) { return this.conn.collection(KIND_CATALOG[kind]); }

  private kindFor(user: unknown): ServiceKind {
    const kind = orderingKindOf(user);
    if (!kind) throw new ForbiddenException('ordering_provider_type_required');
    return kind;
  }

  private kindForItems(user: unknown, serviceKind: unknown): ServiceKind {
    if (!KINDS.includes(serviceKind as ServiceKind)) throw bad('service_kind_invalid');
    const mine = this.kindFor(user);
    if (serviceKind !== mine) throw new ForbiddenException('service_kind_not_offered');
    return mine;
  }

  private audit(actorId: string, action: string, resourceKind: string, resourceId: string, details?: Record<string, unknown>) {
    return recordAudit(this.conn, {
      action, user_id: actorId, role: 'provider', resource_kind: resourceKind, resource_id: resourceId, details,
    });
  }

  // ---------- settings ----------

  async getSettings(user: { id: string }): Promise<OrderingSettings> {
    const doc = await this.settingsCol().findOne({ provider_account_id: user.id }) as unknown as (OrderingSettings & { provider_account_id: string }) | null;
    return doc ? this.settingsView(doc) : defaultSettings();
  }

  private settingsView(doc: Partial<OrderingSettings>): OrderingSettings {
    const d = defaultSettings();
    return {
      modes: (doc.modes ?? d.modes),
      home_fee: doc.home_fee ?? d.home_fee,
      home_radius_km: doc.home_radius_km ?? d.home_radius_km,
      auto_accept: doc.auto_accept ?? d.auto_accept,
      walk_in: doc.walk_in ?? d.walk_in,
      staff_genders: doc.staff_genders ?? d.staff_genders,
      accepted_insurance: doc.accepted_insurance ?? d.accepted_insurance,
    };
  }

  async putSettings(user: { id: string }, kindOrBody: unknown, body?: OrderingSettingsDto): Promise<OrderingSettings> {
    // Called as putSettings(user, body) by the controller; the kind is checked by the route's role list.
    const input = (body ?? kindOrBody) as OrderingSettingsDto;
    const modes = this.normaliseModes(input.modes, 'ordering_modes_required');
    const hasHome = modes.includes('home');
    let homeFee = 0;
    let radius: number | null = null;
    if (hasHome) {
      homeFee = input.home_fee ?? 0;
      if (!isPrice(homeFee)) throw bad('home_fee_invalid');
      const r = input.home_radius_km;
      if (typeof r !== 'number' || !Number.isFinite(r) || r <= 0 || r > MAX_HOME_RADIUS_KM) throw bad('home_radius_invalid');
      radius = r;
    }
    const genders = [...new Set(input.staff_genders ?? [])];
    if (genders.some((g) => !GENDERS.includes(g))) throw bad('staff_genders_invalid');
    const insurance = await this.normaliseInsurance(input.accepted_insurance ?? [], 'accepted_insurance_classes_required');
    const doc: OrderingSettings = {
      modes, home_fee: homeFee, home_radius_km: radius,
      auto_accept: input.auto_accept === true, walk_in: input.walk_in === true,
      staff_genders: genders, accepted_insurance: insurance,
    };
    await this.settingsCol().updateOne(
      { provider_account_id: user.id },
      { $set: { ...doc, updated_at: new Date() }, $setOnInsert: { provider_account_id: user.id, created_at: new Date() } },
      { upsert: true },
    );
    await this.audit(user.id, 'ordering.settings.update', 'provider_ordering_settings', user.id, { modes });
    return doc;
  }

  private normaliseModes(value: unknown, code: string, offered?: OrderMode[]): OrderMode[] {
    if (!Array.isArray(value) || value.length === 0) throw bad(code);
    const out = [...new Set(value)] as OrderMode[];
    for (const m of out) {
      if (!MODES.includes(m)) throw bad(code);
      if (offered && !offered.includes(m)) throw bad('item_mode_not_offered');
    }
    return out;
  }

  private async normaliseInsurance(list: unknown, classesCode: string): Promise<InsurerClasses[]> {
    if (!Array.isArray(list)) throw bad(classesCode);
    const out: InsurerClasses[] = [];
    for (const entry of list as Array<Record<string, unknown>>) {
      const classes = entry?.classes;
      if (!Array.isArray(classes) || classes.length === 0 || classes.some((c) => typeof c !== 'string' || !c.trim())) throw bad(classesCode);
      const companyId = entry.company_id;
      if (typeof companyId !== 'string' || !companyId) throw bad('insurance_company_not_found');
      const company = await this.conn.collection(CATALOG_COLLECTIONS.insurance_companies).findOne({ id: companyId });
      if (!company) throw bad('insurance_company_not_found');
      out.push({ company_id: companyId, classes: [...new Set(classes as string[])], active: entry.active !== false });
    }
    return out;
  }

  // ---------- items ----------

  /** The effective declaration of one item: inherited modes and insurers resolved, modes limited to what the provider offers. */
  private view(kind: ServiceKind, catalog: CatalogDoc, item: ItemDoc | null, settings: OrderingSettings): OrderingItemView {
    const inheritedModes = !item || !Array.isArray(item.modes);
    let modes = (inheritedModes ? settings.modes : (item as ItemDoc).modes as OrderMode[]).filter((m) => settings.modes.includes(m));
    // Home radiology is for portable scans only (catalogue flag portable_ultrasound).
    if (kind === 'radiology' && !catalog.portable_ultrasound) modes = modes.filter((m) => m !== 'home');
    const inheritedInsurance = !item || !Array.isArray(item.accepted_insurance);
    return {
      service_kind: kind,
      catalog_id: catalog.id,
      name_ar: catalog.name_ar ?? null,
      name_en: catalog.name_en ?? null,
      modes,
      prices: item?.prices ?? {},
      accepted_insurance: (inheritedInsurance ? settings.accepted_insurance : item?.accepted_insurance) as InsurerClasses[],
      turnaround_hours: item?.turnaround_hours ?? null,
      preparation: item?.preparation ?? null,
      available: item ? item.available !== false : true,
      inherited: { modes: inheritedModes, accepted_insurance: inheritedInsurance },
    };
  }

  private async catalogRow(kind: ServiceKind, catalogId: string): Promise<CatalogDoc> {
    const row = await this.catalogCol(kind).findOne({ id: catalogId, active: { $ne: false } }) as unknown as CatalogDoc | null;
    if (!row) throw new NotFoundException('catalog_item_not_found');
    return row;
  }

  private async catalogMap(kind: ServiceKind, ids: string[]): Promise<Map<string, CatalogDoc>> {
    const rows = await this.catalogCol(kind).find({ id: { $in: ids }, active: { $ne: false } }).toArray() as unknown as CatalogDoc[];
    return new Map(rows.map((r) => [r.id, r]));
  }

  private async itemsOf(user: { id: string }, kind: ServiceKind, filter: Record<string, unknown> = {}): Promise<ItemDoc[]> {
    return this.itemsCol().find({ provider_account_id: user.id, service_kind: kind, ...filter }).toArray() as unknown as Promise<ItemDoc[]>;
  }

  async listItems(user: { id: string }, serviceKind: unknown): Promise<OrderingItemView[]> {
    const kind = this.kindForItems(user, serviceKind);
    const settings = await this.getSettings(user);
    const items = await this.itemsOf(user, kind);
    const catalog = await this.catalogMap(kind, items.map((i) => i.catalog_id));
    return items.flatMap((item) => {
      const row = catalog.get(item.catalog_id);
      return row ? [this.view(kind, row, item, settings)] : [];
    }).sort((a, b) => a.catalog_id.localeCompare(b.catalog_id));
  }

  /** Validates and returns the price map; every price must be for a mode the item offers. */
  private normalisePrices(input: unknown, offered: OrderMode[]): Partial<Record<OrderMode, number>> {
    if (input === undefined || input === null) return {};
    if (typeof input !== 'object' || Array.isArray(input)) throw bad('item_price_invalid');
    const out: Partial<Record<OrderMode, number>> = {};
    for (const [mode, price] of Object.entries(input as Record<string, unknown>)) {
      if (!MODES.includes(mode as OrderMode) || !offered.includes(mode as OrderMode)) throw bad('item_mode_not_offered');
      if (!isPrice(price)) throw bad('item_price_invalid');
      out[mode as OrderMode] = price;
    }
    return out;
  }

  async putItem(user: { id: string }, body: OrderingItemDto): Promise<OrderingItemView> {
    const kind = this.kindForItems(user, body.service_kind);
    const settings = await this.getSettings(user);
    const catalog = await this.catalogRow(kind, body.catalog_id);
    const modes = body.modes == null ? null : this.normaliseModes(body.modes, 'item_mode_not_offered', settings.modes);
    const offered = modes ?? settings.modes;
    const prices = this.normalisePrices(body.prices, offered);
    if (kind === 'radiology' && !catalog.portable_ultrasound && ((modes ?? []).includes('home') || prices.home !== undefined)) {
      throw bad('home_radiology_portable_only');
    }
    const insurance = body.accepted_insurance == null ? null : await this.normaliseInsurance(body.accepted_insurance, 'item_insurance_classes_required');
    if (body.turnaround_hours != null && (!isPrice(body.turnaround_hours))) throw bad('item_turnaround_invalid');
    const prep = body.preparation == null ? null : {
      ...(typeof body.preparation.ar === 'string' ? { ar: body.preparation.ar } : {}),
      ...(typeof body.preparation.en === 'string' ? { en: body.preparation.en } : {}),
    };
    const doc: ItemDoc = {
      provider_account_id: user.id, service_kind: kind, catalog_id: catalog.id,
      modes, prices, accepted_insurance: insurance,
      turnaround_hours: body.turnaround_hours ?? null, preparation: prep, available: body.available !== false,
    };
    await this.saveItem(user.id, kind, catalog.id, doc);
    await this.audit(user.id, 'ordering.item.upsert', 'provider_ordering_item', catalog.id, { service_kind: kind, modes });
    return this.view(kind, catalog, doc, settings);
  }

  private async saveItem(providerId: string, kind: ServiceKind, catalogId: string, doc: ItemDoc) {
    const { provider_account_id, service_kind, catalog_id, ...declaration } = doc;
    await this.itemsCol().updateOne(
      { provider_account_id: providerId, service_kind: kind, catalog_id: catalogId },
      {
        $set: { ...declaration, updated_at: new Date() },
        $setOnInsert: { id: randomUUID(), provider_account_id, service_kind, catalog_id, created_at: new Date() },
      },
      { upsert: true },
    );
  }

  /** One mode's price on one item (CSV import and bulk edits use the same rules as PUT /items). */
  private async setPrice(user: { id: string }, kind: ServiceKind, settings: OrderingSettings, catalogId: string, mode: unknown, price: number) {
    const catalog = await this.catalogRow(kind, catalogId);
    if (!MODES.includes(mode as OrderMode)) throw bad('item_mode_invalid');
    if (!isPrice(price)) throw bad('item_price_invalid');
    const item = await this.itemsCol().findOne({ provider_account_id: user.id, service_kind: kind, catalog_id: catalogId }) as unknown as ItemDoc | null;
    if (!this.view(kind, catalog, item, settings).modes.includes(mode as OrderMode)) throw bad('item_mode_not_offered');
    await this.itemsCol().updateOne(
      { provider_account_id: user.id, service_kind: kind, catalog_id: catalogId },
      { $set: { [`prices.${mode}`]: price, updated_at: new Date() }, $setOnInsert: { id: randomUUID(), provider_account_id: user.id, service_kind: kind, catalog_id: catalogId, created_at: new Date() } },
      { upsert: true },
    );
  }

  async bulkPrice(user: { id: string }, body: OrderingBulkPriceDto): Promise<{ updated: number }> {
    const kind = this.kindForItems(user, body.service_kind);
    const settings = await this.getSettings(user);
    const mode = body.mode;
    if (!settings.modes.includes(mode)) throw bad('item_mode_not_offered');
    const hasPercent = typeof body.percent === 'number';
    const hasSet = typeof body.set_price === 'number';
    if (hasPercent === hasSet) throw bad('bulk_change_required');
    if (hasPercent && (!Number.isFinite(body.percent) || (body.percent as number) <= -100)) throw bad('item_price_invalid');
    if (hasSet && !isPrice(body.set_price)) throw bad('item_price_invalid');
    const filter: Record<string, unknown> = body.catalog_ids?.length ? { catalog_id: { $in: body.catalog_ids } } : {};
    const items = await this.itemsOf(user, kind, filter);
    const catalog = await this.catalogMap(kind, items.map((i) => i.catalog_id));
    let updated = 0;
    for (const item of items) {
      const row = catalog.get(item.catalog_id);
      if (!row || !this.view(kind, row, item, settings).modes.includes(mode)) continue;
      const current = item.prices?.[mode];
      let next: number;
      if (hasSet) next = body.set_price as number;
      else if (typeof current === 'number') next = round2(current * (1 + (body.percent as number) / 100));
      else continue;
      await this.itemsCol().updateOne(
        { provider_account_id: user.id, service_kind: kind, catalog_id: item.catalog_id },
        { $set: { [`prices.${mode}`]: next, updated_at: new Date() } },
      );
      updated++;
    }
    await this.audit(user.id, 'ordering.items.bulk_price', 'provider_ordering_item', kind, { mode, updated });
    return { updated };
  }

  async copyMode(user: { id: string }, body: OrderingCopyModeDto): Promise<{ copied: number }> {
    const kind = this.kindForItems(user, body.service_kind);
    const settings = await this.getSettings(user);
    if (body.from === body.to) throw bad('copy_mode_invalid');
    if (!settings.modes.includes(body.from) || !settings.modes.includes(body.to)) throw bad('item_mode_not_offered');
    const items = await this.itemsOf(user, kind);
    const catalog = await this.catalogMap(kind, items.map((i) => i.catalog_id));
    let copied = 0;
    for (const item of items) {
      const row = catalog.get(item.catalog_id);
      if (!row || !this.view(kind, row, item, settings).modes.includes(body.to)) continue;
      const from = item.prices?.[body.from];
      if (typeof from !== 'number' || typeof item.prices?.[body.to] === 'number') continue;
      await this.itemsCol().updateOne(
        { provider_account_id: user.id, service_kind: kind, catalog_id: item.catalog_id },
        { $set: { [`prices.${body.to}`]: from, updated_at: new Date() } },
      );
      copied++;
    }
    await this.audit(user.id, 'ordering.items.copy_mode', 'provider_ordering_item', kind, { from: body.from, to: body.to, copied });
    return { copied };
  }

  async exportCsv(user: { id: string }, serviceKind: unknown): Promise<string> {
    const kind = this.kindForItems(user, serviceKind);
    const items = (await this.itemsOf(user, kind)).sort((a, b) => a.catalog_id.localeCompare(b.catalog_id));
    const lines = ['catalog_id,mode,price'];
    for (const item of items) {
      for (const mode of MODES) {
        const price = item.prices?.[mode];
        if (typeof price === 'number') lines.push(`${item.catalog_id},${mode},${price}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }

  async importCsv(user: { id: string }, body: OrderingImportDto): Promise<{ imported: number; rejected: Array<{ line: number; reason: string }> }> {
    const kind = this.kindForItems(user, body.service_kind);
    const settings = await this.getSettings(user);
    const lines = body.csv.split(/\r?\n/);
    if (lines[0].trim() !== 'catalog_id,mode,price') throw bad('csv_header_invalid');
    const rejected: Array<{ line: number; reason: string }> = [];
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;
      const [catalogId, mode, priceText] = raw.split(',').map((s) => s.trim());
      try {
        await this.setPrice(user, kind, settings, catalogId, mode, priceText === '' ? Number.NaN : Number(priceText));
        imported++;
      } catch (e) {
        rejected.push({ line: i + 1, reason: reasonOf(e) });
      }
    }
    if (imported > 0) await this.audit(user.id, 'ordering.items.import', 'provider_ordering_item', kind, { imported, rejected: rejected.length });
    return { imported, rejected };
  }

  // ---------- completeness ----------

  private async weights(): Promise<typeof DEFAULT_WEIGHTS> {
    const doc = await this.conn.collection('system_configs').findOne({ key: 'ordering_completeness_weights' }) as unknown as { value?: Partial<typeof DEFAULT_WEIGHTS> } | null;
    const v = doc?.value ?? {};
    const pick = (k: keyof typeof DEFAULT_WEIGHTS) => (typeof v[k] === 'number' && v[k] >= 0 ? v[k] as number : DEFAULT_WEIGHTS[k]);
    return { prices: pick('prices'), modes_hours: pick('modes_hours'), insurance: pick('insurance'), prep_turnaround: pick('prep_turnaround'), photo_licence: pick('photo_licence') };
  }

  async completeness(user: { id: string }) {
    const kind = this.kindFor(user);
    const settings = await this.getSettings(user);
    const items = await this.itemsOf(user, kind);
    const catalog = await this.catalogMap(kind, items.map((i) => i.catalog_id));
    const views = items.flatMap((item) => {
      const row = catalog.get(item.catalog_id);
      return row ? [this.view(kind, row, item, settings)] : [];
    });
    const total = views.length;
    // With no items declared a part counts as one thing still to add.
    const share = (ok: number) => (total ? ok / total : 0);
    const lacking = (ok: number) => (total ? total - ok : 1);
    const priced = views.filter((v) => Object.values(v.prices).some((p) => typeof p === 'number')).length;
    const insured = views.filter((v) => (v.accepted_insurance ?? []).some((x) => x.active)).length;
    const timed = views.filter((v) => v.turnaround_hours != null).length;
    const slots = await this.conn.collection('provider_schedule_slots').countDocuments({ provider_account_id: user.id, active: { $ne: false } });
    const modesHours = (settings.modes.length ? 0.5 : 0) + (!settings.modes.includes('facility') || settings.walk_in || slots > 0 ? 0.5 : 0);
    const profile = await this.conn.collection('provider_profiles').findOne(
      { id: user.id }, { projection: { medical_license_number: 1, profile_image_id: 1 } },
    ) as { medical_license_number?: string; profile_image_id?: string } | null;
    const photoLicence = (profile?.medical_license_number ? 0.5 : 0) + (profile?.profile_image_id ? 0.5 : 0);
    const parts = {
      prices: share(priced),
      modes_hours: modesHours,
      insurance: share(insured),
      prep_turnaround: share(timed),
      photo_licence: photoLicence,
    };
    const w = await this.weights();
    const weightSum = Object.values(w).reduce((s, x) => s + x, 0);
    const weighted = (Object.keys(parts) as Array<keyof typeof parts>).reduce((s, p) => s + w[p] * parts[p], 0);
    const score = weightSum ? Math.round((weighted / weightSum) * 100) : 0;
    const missing = [
      { part: 'prices', count: lacking(priced) },
      { part: 'modes_hours', count: modesHours < 1 ? 1 : 0 },
      { part: 'insurance', count: lacking(insured) },
      { part: 'prep_turnaround', count: lacking(timed) },
      { part: 'photo_licence', count: photoLicence < 1 ? 1 : 0 },
    ].filter((m) => m.count > 0);
    return { score, parts, missing, weights: w };
  }

  // ---------- admin: legacy rows ----------

  /**
   * Converts the pre-M1 rows (provider_capabilities_lab / _radiology) once. The legacy rows stay where they are.
   * Idempotent: an item that already exists is never overwritten, so a second run migrates nothing.
   */
  async migrateLegacy(actorId: string): Promise<{ migrated: number; skipped: number }> {
    let migrated = 0;
    let skipped = 0;
    const labRows = await this.conn.collection('provider_capabilities_lab').find({}).toArray() as unknown as Array<Record<string, any>>;
    const radRows = await this.conn.collection('provider_capabilities_radiology').find({}).toArray() as unknown as Array<Record<string, any>>;
    const labByCode = new Map((await this.catalogCol('lab').find({}).toArray() as unknown as CatalogDoc[]).map((c: any) => [c.code, c]));
    const radByName = new Map((await this.catalogCol('radiology').find({}).toArray() as unknown as CatalogDoc[]).map((c: any) => [c.name_ar, c]));

    // a provider with no settings yet gets modes from its legacy rows (home flag → home and facility)
    const providers = new Set([...labRows, ...radRows].map((r) => String(r.provider_account_id)));
    for (const pid of providers) {
      const home = labRows.some((r) => r.provider_account_id === pid && r.home_collection_supported === true);
      await this.settingsCol().updateOne(
        { provider_account_id: pid },
        { $setOnInsert: { provider_account_id: pid, ...defaultSettings(), modes: home ? ['home', 'facility'] : ['facility'], created_at: new Date() } },
        { upsert: true },
      );
    }

    const insertIfMissing = async (pid: string, kind: ServiceKind, catalogId: string, legacyId: string, doc: Omit<ItemDoc, 'provider_account_id' | 'service_kind' | 'catalog_id'>) => {
      const r = await this.itemsCol().updateOne(
        { provider_account_id: pid, service_kind: kind, catalog_id: catalogId },
        { $setOnInsert: { id: randomUUID(), provider_account_id: pid, service_kind: kind, catalog_id: catalogId, ...doc, migrated_from: legacyId, created_at: new Date() } },
        { upsert: true },
      );
      if (r.upsertedCount) migrated++;
    };

    for (const row of labRows) {
      const cat = labByCode.get(row.code);
      if (!cat) { skipped++; continue; }
      const home = row.home_collection_supported === true;
      await insertIfMissing(String(row.provider_account_id), 'lab', cat.id, `provider_capabilities_lab:${row.id}`, {
        modes: home ? ['home', 'facility'] : ['facility'],
        prices: { home: row.price, facility: row.price },
        accepted_insurance: row.insurance_covered === true ? null : [],
        turnaround_hours: typeof row.turnaround_hours === 'number' ? row.turnaround_hours : null,
        preparation: null,
        available: row.available !== false,
      });
    }
    for (const row of radRows) {
      const cat = radByName.get(row.name_ar);
      if (!cat) { skipped++; continue; }
      await insertIfMissing(String(row.provider_account_id), 'radiology', cat.id, `provider_capabilities_radiology:${row.id}`, {
        modes: ['facility'],
        prices: { facility: row.price },
        accepted_insurance: row.insurance_covered === true ? null : [],
        turnaround_hours: null,
        preparation: null,
        available: row.available !== false,
      });
    }
    await this.audit(actorId, 'ordering.migrate_capabilities', 'provider_ordering_item', 'legacy', { migrated, skipped });
    return { migrated, skipped };
  }
}
