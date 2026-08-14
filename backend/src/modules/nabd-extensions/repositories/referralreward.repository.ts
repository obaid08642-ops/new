// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  ReferralReward, ReferralRewardDocument  } from '../../../schemas/referral.schema';

@Injectable()
export class ReferralRewardRepository extends MongoRepository<ReferralRewardDocument> {
  constructor(@InjectModel(ReferralReward.name) model: Model<ReferralRewardDocument>) {
    super(model);
  }
}
