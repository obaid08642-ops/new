// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  LoyaltyTransaction, any  } from '../../../schemas/loyalty.schemas';

@Injectable()
export class LoyaltyTransactionRepository extends MongoRepository<any> {
  constructor(@InjectModel(LoyaltyTransaction.name) model: Model<any>) {
    super(model);
  }
}
