// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Order, any  } from '../../../schemas/order.schema';

@Injectable()
export class OrderRepository extends MongoRepository<any> {
  constructor(@InjectModel(Order.name) model: Model<any>) {
    super(model);
  }
}
