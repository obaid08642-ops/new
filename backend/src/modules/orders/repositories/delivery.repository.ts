import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Delivery, DeliveryDocument  } from '../../../schemas/delivery.schema';

@Injectable()
export class DeliveryRepository extends MongoRepository<DeliveryDocument> {
  constructor(@InjectModel(Delivery.name) model: Model<DeliveryDocument>) {
    super(model);
  }
}
