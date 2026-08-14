// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { PharmacyBroadcast } from '../../schemas/pharmacy.schema';

@Injectable()
export class PharmacyBroadcastRepository extends MongoRepository<PharmacyBroadcast> {
  constructor(@InjectModel(PharmacyBroadcast.name) model: Model<PharmacyBroadcast>) {
    super(model);
  }
}
