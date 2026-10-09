import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/** D-16 (owner decision 16, issue #335): one flag per product module. Absent = ON. */
export const MODULE_KEYS = [
  'pharmacy',
  'consultations',
  'labs_radiology',
  'nursing',
  'nutrition',
  'maternity',
  'mental_health',
  'family',
  'insurance',
  'loyalty',
  'ai',
  'articles',
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

/** URL-prefix (after /api/vN) -> module. Longer, specific prefixes win. */
const ROUTE_MAP: Array<[string, ModuleKey]> = [
  ['users/me/insurance', 'insurance'],
  ['patient/pharmacy', 'pharmacy'],
  ['pharmacy/chat', 'pharmacy'],
  ['care/doctors', 'consultations'],
  ['care/appointments', 'consultations'],
  ['care/search', 'consultations'],
  ['consultations', 'consultations'],
  ['labs', 'labs_radiology'],
  ['radiology', 'labs_radiology'],
  ['nursing', 'nursing'],
  ['home-care', 'nursing'],
  ['nutrition', 'nutrition'],
  ['maternity', 'maternity'],
  ['mental-health', 'mental_health'],
  ['family', 'family'],
  ['insurance', 'insurance'],
  ['loyalty', 'loyalty'],
  ['ai', 'ai'],
  ['articles', 'articles'],
];

/** Cache TTL: every instance sees a switch within 5 s without a restart. */
const CACHE_TTL_MS = 2000;

@Injectable()
export class ModuleSwitchesService {
  private cache: { at: number; map: Record<string, boolean> } | null = null;

  constructor(@InjectConnection() private readonly conn: Connection) {}

  /** Path segment check: any /admin/ route (manager UI) is never blocked. */
  static isAdminRoute(path: string): boolean {
    return /(^|\/)admin(\/|$)/.test(path);
  }

  /** The module owning a request path, or null when no switch governs it. */
  static moduleFor(path: string): ModuleKey | null {
    const clean = path.replace(/^\/api\/v\d+\//, '').replace(/^\/+/, '');
    if (clean === 'modules' || clean.startsWith('modules/')) return null;
    for (const [prefix, key] of ROUTE_MAP) {
      if (clean === prefix || clean.startsWith(prefix + '/')) return key;
    }
    return null;
  }

  private async readAll(): Promise<Record<string, boolean>> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_TTL_MS) return this.cache.map;
    const rows: any[] = await this.conn.db.collection('module_switches').find({}).toArray().catch(() => []);
    const map: Record<string, boolean> = {};
    for (const k of MODULE_KEYS) map[k] = true;
    for (const r of rows) {
      if (MODULE_KEYS.includes(r.key)) map[r.key] = r.enabled !== false;
    }
    this.cache = { at: now, map };
    return map;
  }

  async modules(): Promise<Record<string, boolean>> {
    return this.readAll();
  }

  async isEnabled(key: string): Promise<boolean> {
    return (await this.readAll())[key] !== false;
  }

  async set(key: string, enabled: boolean, reason: string): Promise<{ key: string; enabled: boolean }> {
    if (!MODULE_KEYS.includes(key as ModuleKey)) throw new NotFoundException('unknown_module');
    if (typeof enabled !== 'boolean') throw new BadRequestException('enabled must be boolean');
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      throw new BadRequestException('reason_required');
    }
    await this.conn.db.collection('module_switches').updateOne(
      { key },
      { $set: { key, enabled, reason: reason.trim(), updated_at: new Date() } },
      { upsert: true },
    );
    this.cache = null;
    return { key, enabled };
  }
}
