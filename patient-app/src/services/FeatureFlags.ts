/**
 * Feature Flags — Remote config-driven feature toggling.
 * Supports percentage rollout, country/platform targeting, A/B prep.
 * Falls back to static defaults when remote is unavailable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type FlagKey =
  // Product Discovery Platform
  | 'guided_tours'
  | 'whats_new'
  | 'contextual_tips'
  | 'feature_badges'
  | 'ai_hints'
  | 'interactive_steps'
  | 'success_celebration'
  | 'resume_prompt'
  // App Features
  | 'pharmacy_scanner'
  | 'voice_search'
  | 'ai_assistant'
  | 'loyalty_program'
  | 'video_consultations'
  | 'prescription_renewal'
  | 'health_monitoring'
  | 'emergency_sos'
  // Development
  | 'debug_overlay'
  | 'analytics_verbose';

export interface FeatureFlag {
  key: FlagKey;
  enabled: boolean;
  targeting?: {
    countries?: string[];
    platforms?: ('ios' | 'android')[];
    minAppVersion?: string;
    userPercentage?: number;
    userIds?: string[];
  };
  variant?: string;          // for A/B testing
  metadata?: Record<string, unknown>;
}

export interface FlagEvaluationContext {
  userId: string;           // hashed
  country?: string;
  appVersion: string;
  platform: 'ios' | 'android';
}

// ─────────────────────────────────────────────────────────────────────────────
// Static defaults — shipped with the bundle
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_DEFAULTS: Record<FlagKey, boolean> = {
  guided_tours:          true,
  whats_new:             true,
  contextual_tips:       true,
  feature_badges:        true,
  ai_hints:              false,   // Phase 4
  interactive_steps:     true,
  success_celebration:   true,
  resume_prompt:         true,
  pharmacy_scanner:      true,
  voice_search:          true,
  ai_assistant:          false,   // Phase 4
  loyalty_program:       false,   // coming soon
  video_consultations:   true,
  prescription_renewal:  false,
  health_monitoring:     true,
  emergency_sos:         true,
  debug_overlay:         false,
  analytics_verbose:     false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────
const FLAGS_CACHE_KEY = '@nabdah_feature_flags';
const FLAGS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─────────────────────────────────────────────────────────────────────────────
// Feature Flags Manager
// ─────────────────────────────────────────────────────────────────────────────
export class FeatureFlagsManager {
  private flags: Map<FlagKey, FeatureFlag> = new Map();
  private context: FlagEvaluationContext | null = null;
  private initialized = false;

  async initialize(context: FlagEvaluationContext): Promise<void> {
    this.context = context;

    // Load from cache first (fast)
    const cached = await this.loadFromCache();
    if (cached) {
      cached.forEach((f) => this.flags.set(f.key as FlagKey, f));
    } else {
      // Seed with static defaults
      (Object.keys(STATIC_DEFAULTS) as FlagKey[]).forEach((key) => {
        this.flags.set(key, { key, enabled: STATIC_DEFAULTS[key] });
      });
    }

    this.initialized = true;
  }

  /** Update from remote config response */
  updateFromRemote(flags: FeatureFlag[]): void {
    flags.forEach((f) => this.flags.set(f.key as FlagKey, f));
    this.persistToCache(flags);
  }

  /** Check if a feature is enabled for current context */
  isEnabled(key: FlagKey): boolean {
    const flag = this.flags.get(key);
    if (!flag) return STATIC_DEFAULTS[key] ?? false;
    if (!flag.enabled) return false;
    if (!flag.targeting || !this.context) return flag.enabled;

    return this.evaluateTargeting(flag, this.context);
  }

  /** Get variant for A/B testing */
  getVariant(key: FlagKey): string | null {
    return this.flags.get(key)?.variant ?? null;
  }

  /** Override a flag locally (dev/testing) */
  override(key: FlagKey, enabled: boolean): void {
    const existing = this.flags.get(key) ?? { key, enabled: false };
    this.flags.set(key, { ...existing, enabled });
  }

  private evaluateTargeting(
    flag: FeatureFlag,
    ctx: FlagEvaluationContext,
  ): boolean {
    const t = flag.targeting!;

    if (t.countries && ctx.country && !t.countries.includes(ctx.country)) return false;

    if (t.platforms && !t.platforms.includes(ctx.platform)) return false;

    if (t.minAppVersion && !this.versionGte(ctx.appVersion, t.minAppVersion)) return false;

    if (t.userPercentage !== undefined) {
      const bucket = this.getBucket(ctx.userId, flag.key);
      if (bucket >= t.userPercentage) return false;
    }

    return true;
  }

  private getBucket(userId: string, flagKey: string): number {
    // Deterministic hash → consistent assignment per user per flag
    let hash = 0;
    const str = `${userId}:${flagKey}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }

  private versionGte(version: string, minVersion: string): boolean {
    const a = version.split('.').map(Number);
    const b = minVersion.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
      if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
    }
    return true;
  }

  private async loadFromCache(): Promise<FeatureFlag[] | null> {
    try {
      const raw = await AsyncStorage.getItem(FLAGS_CACHE_KEY);
      if (!raw) return null;
      const { flags, cachedAt } = JSON.parse(raw);
      if (Date.now() - cachedAt > FLAGS_CACHE_TTL_MS) return null;
      return flags;
    } catch {
      return null;
    }
  }

  private async persistToCache(flags: FeatureFlag[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        FLAGS_CACHE_KEY,
        JSON.stringify({ flags, cachedAt: Date.now() }),
      );
    } catch { /* ignore */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────
export const featureFlags = new FeatureFlagsManager();
