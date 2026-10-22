import type { InsurerClasses, OrderMode, OrderingItemView, OrderingSettings, ServiceKind, CompletenessPart } from '../../api/ordering';

/** Service kind from the provider's own role (mirrors orderingKindOf in the backend service). */
export function kindOfRoles(roles: Array<string | undefined | null>): ServiceKind | null {
  const r = roles.map((x) => String(x || '').toLowerCase());
  if (r.includes('lab')) return 'lab';
  if (r.includes('radiology')) return 'radiology';
  if (r.includes('nursing') || r.includes('nurse')) return 'nursing';
  return null;
}

/** Stable backend codes -> short Arabic / English messages. */
const MESSAGES: Record<string, [string, string]> = {
  ordering_modes_required: ['اختر طريقة خدمة واحدة على الأقل', 'Choose at least one service mode'],
  home_fee_invalid: ['رسوم الزيارة غير صالحة', 'The visit fee is not valid'],
  home_radius_invalid: ['النطاق يجب أن يكون بين 1 و50 كم', 'Radius must be between 1 and 50 km'],
  staff_genders_invalid: ['جنس الطاقم غير صالح', 'Staff gender is not valid'],
  accepted_insurance_classes_required: ['اختر فئة واحدة على الأقل لكل شركة تأمين', 'Pick at least one class for each insurer'],
  item_insurance_classes_required: ['اختر فئة واحدة على الأقل لكل شركة تأمين', 'Pick at least one class for each insurer'],
  insurance_company_not_found: ['شركة التأمين غير موجودة', 'Insurance company not found'],
  item_price_invalid: ['السعر غير صالح', 'The price is not valid'],
  item_mode_invalid: ['طريقة الخدمة غير صالحة', 'The mode is not valid'],
  item_mode_not_offered: ['هذه الطريقة غير مفعّلة في إعداداتك', 'This mode is not turned on in your setup'],
  item_turnaround_invalid: ['مدة النتيجة غير صالحة', 'The turnaround is not valid'],
  home_radiology_portable_only: ['الأشعة المنزلية متاحة للأجهزة المحمولة فقط', 'Home radiology is for portable units only'],
  catalog_item_not_found: ['الفحص غير موجود في الكتالوج', 'Test not in the catalogue'],
  bulk_change_required: ['حدّد نسبة أو سعرًا ثابتًا', 'Enter a percentage or a fixed price'],
  copy_mode_invalid: ['اختر وضعين مختلفين', 'Pick two different modes'],
  csv_header_invalid: ['الملف غير صالح: يجب أن يبدأ بـ catalog_id,mode,price', 'The file is not valid: it must start with catalog_id,mode,price'],
  service_kind_invalid: ['نوع الخدمة غير صالح', 'Service kind is not valid'],
  service_kind_not_offered: ['هذا النوع غير متاح لحسابك', 'This kind is not offered by your account'],
  ordering_provider_type_required: ['هذه الميزة للمختبرات والأشعة والتمريض فقط', 'Only for labs, radiology and nursing'],
};

export function errorCodeOf(err: any): string {
  const m = err?.response?.data?.message ?? err?.message;
  const first = Array.isArray(m) ? m[0] : m;
  return typeof first === 'string' ? first : '';
}

export function orderingErrorMessage(err: any, ar: boolean): string {
  const code = errorCodeOf(err);
  const hit = MESSAGES[code];
  if (hit) return ar ? hit[0] : hit[1];
  const status = err?.response?.status ?? err?.statusCode;
  if (!err?.response && !status) return ar ? 'تحقق من الاتصال ثم حاول مرة أخرى' : 'Check your connection and try again';
  return ar ? 'تعذّر إتمام العملية' : 'Could not complete the action';
}

/** A Number() that treats empty / non numeric text as undefined. */
export function parseAmount(text: string): number | undefined {
  const t = String(text ?? '').trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Insurer entries with at least one class (the backend rejects an empty class list). */
export function setInsurerClasses(list: InsurerClasses[], companyId: string, classes: string[]): InsurerClasses[] {
  const rest = list.filter((x) => x.company_id !== companyId);
  return classes.length ? [...rest, { company_id: companyId, classes, active: true }] : rest;
}

export function insuranceSummary(list: InsurerClasses[]): { companies: number; classes: number } {
  const active = list.filter((x) => x.active);
  return { companies: active.length, classes: active.reduce((s, x) => s + x.classes.length, 0) };
}

export type SettingsValidation = { ok: boolean; code?: string };
/** Client-side mirror of the cheap backend checks so a step can be blocked before the request. */
export function validateSettings(s: OrderingSettings): SettingsValidation {
  if (!s.modes.length) return { ok: false, code: 'ordering_modes_required' };
  if (s.modes.includes('home')) {
    if (!(s.home_fee >= 0) || !Number.isFinite(s.home_fee)) return { ok: false, code: 'home_fee_invalid' };
    const r = s.home_radius_km;
    if (typeof r !== 'number' || !Number.isFinite(r) || r <= 0 || r > 50) return { ok: false, code: 'home_radius_invalid' };
  }
  if (s.accepted_insurance.some((x) => !x.classes.length)) return { ok: false, code: 'accepted_insurance_classes_required' };
  return { ok: true };
}

/** Payload as the backend stores it: home-only fields are dropped when home is off. */
export function buildSettingsPayload(s: OrderingSettings): OrderingSettings {
  const home = s.modes.includes('home');
  return { ...s, home_fee: home ? s.home_fee : 0, home_radius_km: home ? s.home_radius_km : null };
}

export function itemName(i: { name_ar: string | null; name_en: string | null; catalog_id: string }, ar: boolean): string {
  return (ar ? i.name_ar || i.name_en : i.name_en || i.name_ar) || i.catalog_id;
}

export type ItemFilter = 'all' | 'noprice' | 'custom';
const hasAnyPrice = (i: OrderingItemView) => Object.values(i.prices).some((p) => typeof p === 'number');
/** An item is customised when it carries its own modes or insurer list, or a turnaround / preparation text. */
export const isCustom = (i: OrderingItemView) => !i.inherited.modes || !i.inherited.accepted_insurance || i.turnaround_hours != null || !!(i.preparation && (i.preparation.ar || i.preparation.en));
export const lacksPrice = (i: OrderingItemView) => i.available && !hasAnyPrice(i);

export function filterItems(items: OrderingItemView[], q: string, f: ItemFilter, ar: boolean): OrderingItemView[] {
  const needle = q.trim().toLowerCase();
  return items.filter((i) => {
    if (f === 'noprice' && !lacksPrice(i)) return false;
    if (f === 'custom' && !isCustom(i)) return false;
    if (!needle) return true;
    return `${i.name_ar ?? ''} ${i.name_en ?? ''} ${i.catalog_id}`.toLowerCase().includes(needle) || itemName(i, ar).toLowerCase().includes(needle);
  });
}

/** Insurers (company ids) of the provider defaults that an item does not cover. Empty item list = inherits = nothing missing. */
export function uncoveredCompanies(item: OrderingItemView, defaults: InsurerClasses[]): string[] {
  if (item.inherited.accepted_insurance) return [];
  const have = new Set(item.accepted_insurance.filter((x) => x.active).map((x) => x.company_id));
  return defaults.filter((d) => d.active && !have.has(d.company_id)).map((d) => d.company_id);
}

/** PUT /items body for an override: empty price text means "no price for that mode" (the field is left out). */
export function buildItemPayload(
  kind: ServiceKind,
  base: OrderingItemView,
  draft: { facility: string; home: string; turnaround: string; prep_ar: string; prep_en: string; available: boolean; homeAllowed: boolean },
  settingsModes: OrderMode[],
  portableHome: boolean,
): { body: import('../../api/ordering').OrderingItemInput; error?: string } {
  const prices: Partial<Record<OrderMode, number>> = {};
  for (const [mode, text] of [['facility', draft.facility], ['home', draft.home]] as Array<[OrderMode, string]>) {
    if (!text.trim()) continue;
    const n = parseAmount(text);
    if (n === undefined || n < 0) return { body: {} as never, error: 'item_price_invalid' };
    prices[mode] = n;
  }
  const tText = draft.turnaround.trim();
  const turnaround = tText ? parseAmount(tText) : undefined;
  if (tText && (turnaround === undefined || turnaround < 0)) return { body: {} as never, error: 'item_turnaround_invalid' };
  // Modes: explicit only when the provider turned a mode off for this item; otherwise the item keeps inheriting.
  const effective = settingsModes.filter((m) => m !== 'home' || portableHome || kind !== 'radiology');
  const wanted = effective.filter((m) => m !== 'home' || draft.homeAllowed);
  const sameAsDefault = wanted.length === effective.length;
  if (!wanted.includes('home') && prices.home !== undefined) return { body: {} as never, error: 'item_mode_not_offered' };
  const prep: { ar?: string; en?: string } = {};
  if (draft.prep_ar.trim()) prep.ar = draft.prep_ar.trim();
  if (draft.prep_en.trim()) prep.en = draft.prep_en.trim();
  return {
    body: {
      service_kind: kind,
      catalog_id: base.catalog_id,
      modes: sameAsDefault && base.inherited.modes ? null : wanted,
      prices,
      // keep the insurer list as it is: an inherited list stays inherited
      accepted_insurance: base.inherited.accepted_insurance ? null : base.accepted_insurance,
      turnaround_hours: turnaround ?? null,
      preparation: Object.keys(prep).length ? prep : null,
      available: draft.available,
    },
  };
}

export type BulkInput = { op: 'percent' | 'set'; value: string; mode: OrderMode };
export function buildBulkPayload(kind: ServiceKind, input: BulkInput, ids: string[]): { body?: { service_kind: ServiceKind; mode: OrderMode; percent?: number; set_price?: number; catalog_ids?: string[] }; error?: string } {
  const n = parseAmount(input.value);
  if (n === undefined) return { error: 'bulk_change_required' };
  if (input.op === 'percent' && n <= -100) return { error: 'item_price_invalid' };
  if (input.op === 'set' && n < 0) return { error: 'item_price_invalid' };
  return { body: { service_kind: kind, mode: input.mode, ...(input.op === 'percent' ? { percent: n } : { set_price: n }), ...(ids.length ? { catalog_ids: ids } : {}) } };
}

/** What the new price of an item would be (before / after preview); undefined when it has no price in that mode. */
export function previewPrice(current: number | undefined, input: BulkInput): number | undefined {
  const n = parseAmount(input.value);
  if (n === undefined) return undefined;
  if (input.op === 'set') return n >= 0 ? n : undefined;
  if (typeof current !== 'number' || n <= -100) return undefined;
  return Math.round(current * (1 + n / 100) * 100) / 100;
}

/** CSV helpers. The backend header is exactly catalog_id,mode,price. */
export const CSV_HEADER = 'catalog_id,mode,price';
export function csvTemplate(): string { return `${CSV_HEADER}\n`; }
export function looksLikeCsv(text: string): boolean {
  return String(text ?? '').replace(/^﻿/, '').split(/\r?\n/)[0].trim() === CSV_HEADER;
}
export function stripBom(text: string): string { return String(text ?? '').replace(/^﻿/, ''); }
export function rejectedToCsv(rows: Array<{ line: number; reason: string }>): string {
  return ['line,reason', ...rows.map((r) => `${r.line},${r.reason}`)].join('\n') + '\n';
}

export const PART_ORDER: CompletenessPart[] = ['prices', 'modes_hours', 'insurance', 'prep_turnaround', 'photo_licence'];
/** Points a part still adds to the score: weight share of what is missing, from the real weights the API returned. */
export function partPoints(part: CompletenessPart, parts: Record<CompletenessPart, number>, weights: Record<CompletenessPart, number>): number {
  const sum = PART_ORDER.reduce((s, p) => s + (weights[p] || 0), 0);
  if (!sum) return 0;
  return Math.round(((weights[part] || 0) * (1 - (parts[part] || 0)) / sum) * 100);
}
