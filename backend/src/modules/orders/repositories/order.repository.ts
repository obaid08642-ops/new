// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Order, OrderDocument  } from '../../../schemas/order.schema';

@Injectable()
export class OrderRepository extends MongoRepository<OrderDocument> {
  constructor(@InjectModel(Order.name) model: Model<OrderDocument>) {
    super(model);
  }
}
