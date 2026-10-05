import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// F9: the module registers the LOCAL { key, enabled } schema under the
// 'FeatureFlag' token (feature-flags.module.ts), so the repository must be
// typed against it — the previous import pointed at the unrelated legacy
// { flagName, isEnabled } schema, which made findOne({key})/create({key})
// lie at the type level while working at runtime.
import {  FeatureFlag, FeatureFlagDocument  } from '../feature-flag.schema';

@Injectable()
export class FeatureFlagRepository extends MongoRepository<FeatureFlagDocument> {
  constructor(@InjectModel(FeatureFlag.name) model: Model<FeatureFlagDocument>) {
    super(model);
  }
}
