// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import {  ProviderAvailability  } from '../../../../schemas/provider-availability.schema';

@Injectable()
export class ProviderAvailabilityRepository extends MongoRepository<ProviderAvailability> {
  constructor(@InjectModel(ProviderAvailability.name) model: Model<ProviderAvailability>) {
    super(model);
  }
}
