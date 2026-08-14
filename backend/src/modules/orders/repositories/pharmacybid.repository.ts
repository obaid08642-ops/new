// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  PharmacyBid, any  } from '../../../schemas/order.schema';

@Injectable()
export class PharmacyBidRepository extends MongoRepository<any> {
  constructor(@InjectModel(PharmacyBid.name) model: Model<any>) {
    super(model);
  }
}
