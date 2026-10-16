import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { validateReason } from '../../common/rbac';
import { AdminAuditService } from '../admin/enterprise/audit.service';
import { EMERGENCY_APPS, KILL_SWITCHES, KILL_SWITCH_KEYS, KillSwitchKey } from './kill-switches.registry';

const KILL_SWITCHES_DOC = 'kill_switches';
const EMERGENCY_DOC = 'emergency_maintenance';
const APP_VERSIONS_DOC = 'app_versions';
/** Every instance sees a change within this window, without a restart (same as the module switches). */
const CACHE_TTL_MS = 2000;

export interface KillSwitchRow {
  key: string;
  name: string;
  description: string;
  danger: boolean;
  value: boolean;
  reason: string | null;
  updated_by: string | null;
  updated_at: Date | null;
}

export interface EmergencyState {
  active: boolean;
  reason: string | null;
  updated_by: string | null;
  updated_at: Date | null;
}

interface StoredSwitch { key: string; value?: unknown; reason?: string; updated_by?: string; updated_at?: Date }
interface StoredApp { maintenance?: boolean; [field: string]: unknown }
interface Actor { id?: string; full_name?: string; email?: string; role?: string }

/** Thrown when a switched-off capability is asked for. 503: the platform refuses on purpose, for now. */
export function killSwitchOff(key: string): ServiceUnavailableException {
  return new ServiceUnavailableException({ statusCode: 503, code: 'kill_switch_off', key, message: `kill_switch_off:${key}` });
}

@Injectable()
export class KillSwitchesService {
  private switchCache: { at: number; map: Record<string, StoredSwitch> } | null = null;
  private emergencyCache: { at: number; active: boolean } | null = null;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  private get configs() { return this.conn.collection('system_configs'); }

  private async stored(): Promise<Record<string, StoredSwitch>> {
    const now = Date.now();
    if (this.switchCache && now - this.switchCache.at < CACHE_TTL_MS) return this.switchCache.map;
    const map: Record<string, StoredSwitch> = {};
    try {
      const doc = await this.configs.findOne({ key: KILL_SWITCHES_DOC });
      const list: unknown = doc?.value;
      if (Array.isArray(list)) {
        for (const entry of list as StoredSwitch[]) {
          if (entry && typeof entry.key === 'string') map[entry.key] = entry;
        }
      }
    } catch {
      // Config store unavailable: every switch reads ON (fail-open, never a platform-wide refusal by accident).
      return {};
    }
    this.switchCache = { at: now, map };
    return map;
  }

  /** ON unless an admin explicitly stored `value: false`. */
  async isOn(key: KillSwitchKey): Promise<boolean> {
    return (await this.stored())[key]?.value !== false;
  }

  /** Refuses the action when its switch is off. Call it before anything is stored. */
  async assertOn(key: KillSwitchKey): Promise<void> {
    if (!(await this.isOn(key))) throw killSwitchOff(key);
  }

  async list(): Promise<KillSwitchRow[]> {
    this.switchCache = null;
    const stored = await this.stored();
    return KILL_SWITCHES.map((def) => {
      const s = stored[def.key];
      return {
        ...def,
        value: s?.value !== false,
        reason: s?.reason ?? null,
        updated_by: s?.updated_by ?? null,
        updated_at: s?.updated_at ?? null,
      };
    });
  }

  async set(key: string, value: boolean, rawReason: unknown, actor: Actor): Promise<KillSwitchRow[]> {
    if (!KILL_SWITCH_KEYS.includes(key)) throw new NotFoundException('unknown_kill_switch');
    const reason = validateReason(rawReason);
    const doc = await this.configs.findOne({ key: KILL_SWITCHES_DOC });
    const current: StoredSwitch[] = Array.isArray(doc?.value) ? (doc!.value as StoredSwitch[]) : [];
    const before = current.find((s) => s?.key === key);
    const entry: StoredSwitch = { key, value, reason, updated_by: actor?.id ?? undefined, updated_at: new Date() };
    // Keep only known switches: stale rows of removed switches must not linger as fake controls.
    const next = [...current.filter((s) => s?.key !== key && KILL_SWITCH_KEYS.includes(s?.key)), entry];
    await this.configs.updateOne(
      { key: KILL_SWITCHES_DOC },
      { $set: { key: KILL_SWITCHES_DOC, value: next, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    this.switchCache = null;
    await this.audit.write({
      action: 'kill_switch_update',
      actor,
      target_type: 'kill_switch',
      target_id: key,
      reason,
      before: { value: before?.value !== false },
      after: { value },
    });
    return this.list();
  }

  // ---- emergency maintenance -------------------------------------------------------------------------------

  async emergencyState(): Promise<EmergencyState> {
    const doc = await this.configs.findOne({ key: EMERGENCY_DOC });
    const v = doc?.value as { active?: boolean; reason?: string; updated_by?: string; updated_at?: Date } | undefined;
    return { active: v?.active === true, reason: v?.reason ?? null, updated_by: v?.updated_by ?? null, updated_at: v?.updated_at ?? null };
  }

  /** Cached read for the request path. Store outage => not in maintenance (fail-open). */
  async isEmergencyActive(): Promise<boolean> {
    const now = Date.now();
    if (this.emergencyCache && now - this.emergencyCache.at < CACHE_TTL_MS) return this.emergencyCache.active;
    let active = false;
    try {
      active = (await this.emergencyState()).active;
    } catch {
      return false;
    }
    this.emergencyCache = { at: now, active };
    return active;
  }

  /**
   * Turns the whole platform's emergency maintenance on or off.
   * On: every app's maintenance banner is raised (the apps and the website show their maintenance screen) and the
   * server refuses every non-admin write (EmergencyMaintenanceMiddleware). The apps' previous banner flags are kept.
   * Off: the previous banner flags are put back exactly and writes are accepted again.
   */
  async setEmergency(active: boolean, rawReason: unknown, actor: Actor): Promise<EmergencyState & { message: string }> {
    const reason = validateReason(rawReason);
    const doc = await this.configs.findOne({ key: EMERGENCY_DOC });
    const prev = (doc?.value || {}) as { active?: boolean; previous_apps?: Record<string, boolean> };
    const appsDoc = await this.configs.findOne({ key: APP_VERSIONS_DOC });
    const appsValue = (appsDoc?.value && typeof appsDoc.value === 'object' ? appsDoc.value : {}) as { apps?: Record<string, StoredApp> };
    const apps: Record<string, StoredApp> = { ...(appsValue.apps || {}) };

    let previousApps: Record<string, boolean> = prev.previous_apps || {};
    if (active && prev.active !== true) {
      previousApps = {};
      for (const app of EMERGENCY_APPS) {
        previousApps[app] = apps[app]?.maintenance === true;
        apps[app] = { ...(apps[app] || {}), maintenance: true };
      }
    } else if (!active && prev.active === true) {
      for (const app of EMERGENCY_APPS) {
        apps[app] = { ...(apps[app] || {}), maintenance: previousApps[app] === true };
      }
      previousApps = {};
    }
    if (active !== (prev.active === true)) {
      await this.configs.updateOne(
        { key: APP_VERSIONS_DOC },
        { $set: { key: APP_VERSIONS_DOC, value: { ...appsValue, apps }, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
        { upsert: true },
      );
    }
    const at = new Date();
    await this.configs.updateOne(
      { key: EMERGENCY_DOC },
      { $set: { key: EMERGENCY_DOC, value: { active, reason, updated_by: actor?.id ?? null, updated_at: at, previous_apps: previousApps }, updatedAt: at }, $setOnInsert: { createdAt: at } },
      { upsert: true },
    );
    this.emergencyCache = null;
    await this.audit.write({
      action: active ? 'emergency_maintenance_on' : 'emergency_maintenance_off',
      actor,
      target_type: 'system',
      target_id: EMERGENCY_DOC,
      reason,
      before: { active: prev.active === true },
      after: { active },
    });
    return {
      active,
      reason,
      updated_by: actor?.id ?? null,
      updated_at: at,
      message: active ? 'emergency_maintenance_on' : 'emergency_maintenance_off',
    };
  }
}
