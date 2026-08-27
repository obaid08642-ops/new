import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  FeatureFlag, FeatureFlagDocument  } from '../../../schemas/feature-flag.schema';

@Injectable()
export class FeatureFlagRepository extends MongoRepository<FeatureFlagDocument> {
  constructor(@InjectModel(FeatureFlag.name) model: Model<FeatureFlagDocument>) {
    super(model);
  }
}
