// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  LoyaltyAccount, any  } from '../../../schemas/loyalty.schemas';

@Injectable()
export class LoyaltyAccountRepository extends MongoRepository<any> {
  constructor(@InjectModel(LoyaltyAccount.name) model: Model<any>) {
    super(model);
  }
}
