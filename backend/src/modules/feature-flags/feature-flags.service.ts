import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { FeatureFlag, FeatureFlagDocument } from './feature-flag.schema';
import { FeatureFlagRepository } from "./repositories/featureflag.repository";

@Injectable()
export class FeatureFlagsService {
  constructor(@Inject('FeatureFlagRepository') private readonly flagModel: FeatureFlagRepository) {}

  async isEnabled(flagKey: string): Promise<boolean> {
    const flag = await this.flagModel.findOne({ key: { $eq: flagKey } }).exec();
    return flag ? flag.enabled : false;
  }

  async setFlag(flagKey: string, enabled: boolean): Promise<FeatureFlag> {
    return this.flagModel.findOneAndUpdate({ key: { $eq: flagKey } }, { enabled }, { upsert: true, new: true }).exec();
  }

  async getAll(): Promise<FeatureFlag[]> {
    return this.flagModel.find({}).exec();
  }
}
