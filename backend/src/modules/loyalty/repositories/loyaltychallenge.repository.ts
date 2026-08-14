// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  LoyaltyChallenge, any  } from '../../../schemas/loyalty.schemas';

@Injectable()
export class LoyaltyChallengeRepository extends MongoRepository<any> {
  constructor(@InjectModel(LoyaltyChallenge.name) model: Model<any>) {
    super(model);
  }
}
