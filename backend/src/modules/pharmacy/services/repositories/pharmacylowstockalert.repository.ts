import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { PharmacyLowStockAlert } from '../../schemas/pharmacy.schema';

@Injectable()
export class PharmacyLowStockAlertRepository extends MongoRepository<PharmacyLowStockAlert> {
  constructor(@InjectModel(PharmacyLowStockAlert.name) model: Model<PharmacyLowStockAlert>) {
    super(model);
  }
}
