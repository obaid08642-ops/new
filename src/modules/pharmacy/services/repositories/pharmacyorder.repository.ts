import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { PharmacyOrder } from '../../schemas/pharmacy.schema';

@Injectable()
export class PharmacyOrderRepository extends MongoRepository<PharmacyOrder> {
  constructor(@InjectModel(PharmacyOrder.name) model: Model<PharmacyOrder>) {
    super(model);
  }
}
