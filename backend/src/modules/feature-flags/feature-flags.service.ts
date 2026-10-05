import { Injectable, Inject, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { FeatureFlag, FeatureFlagDocument } from './feature-flag.schema';
import { FeatureFlagRepository } from "./repositories/featureflag.repository";
import { KILLSWITCH_FEATURES } from '../../common/killswitches/killswitches.helper';

/**
 * Canonical values of the six 15.12 kill-switch flags. Absent == enabled
 * (fail-open): a missing row must read as "not killed", so seeding creates
 * every flag as enabled:true and never overwrites an admin's explicit choice.
 */
export const KILL_SWITCH_FLAG_KEYS: string[] = [...Object.values(KILLSWITCH_FEATURES)];

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(@Inject('FeatureFlagRepository') private readonly flagModel: FeatureFlagRepository) {}

  /**
   * F9 — absent flag => null (NOT false). Returning false for a missing row
   * inverted the kill-switch contract: isKilled() could no longer tell
   * "explicitly disabled" from "never seeded" and every switch read as
   * killed. Consumers apply their own default to null (isKilled defaults to
   * not-killed = fail-open).
   */
  async isEnabled(flagKey: string): Promise<boolean | null> {
    const flag = await this.flagModel.findOne({ key: { $eq: flagKey } }).exec();
    return flag ? !!flag.enabled : null;
  }

  /**
   * F9 — seed the kill-switch flags so absent never happens in practice.
   * Creates ONLY missing rows (enabled:true); an admin-disabled flag is
   * never overwritten. Safe to run on every boot (OnModuleInit) and in
   * deployment jobs. Returns the keys it created.
   */
  async ensureSeeded(keys: string[] = KILL_SWITCH_FLAG_KEYS): Promise<string[]> {
    const seeded: string[] = [];
    for (const key of keys) {
      const existing = await this.flagModel.findOne({ key: { $eq: key } }).exec();
      if (!existing) {
        await this.flagModel.create({ key, enabled: true } as any);
        seeded.push(key);
      }
    }
    if (seeded.length) this.logger.log(`seeded kill-switch flags: ${seeded.join(', ')}`);
    return seeded;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureSeeded();
    } catch (e: any) {
      // Flag-store outage at boot must not take the app down; consumers
      // fail open to "not killed" until seeding succeeds on a later boot.
      this.logger.warn(`kill-switch seeding deferred: ${e?.message}`);
    }
  }

  async setFlag(flagKey: string, enabled: boolean): Promise<FeatureFlag> {
    return this.flagModel.findOneAndUpdate({ key: { $eq: flagKey } }, { enabled }, { upsert: true, new: true }).exec();
  }

  async getAll(): Promise<FeatureFlag[]> {
    return this.flagModel.find({}).exec();
  }
}
