import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  ReferralCode, ReferralCodeDocument  } from '../../../schemas/referral.schema';

@Injectable()
export class ReferralCodeRepository extends MongoRepository<ReferralCodeDocument> {
  constructor(@InjectModel(ReferralCode.name) model: Model<ReferralCodeDocument>) {
    super(model);
  }
}
