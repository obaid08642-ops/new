import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { PharmacyAllocation } from '../../schemas/pharmacy.schema';

@Injectable()
export class PharmacyAllocationRepository extends MongoRepository<PharmacyAllocation> {
  constructor(@InjectModel(PharmacyAllocation.name) model: Model<PharmacyAllocation>) {
    super(model);
  }
}
