import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import {  ProviderAvailability  } from '../../../provider/schemas/requests.schema';

type ProviderAvailabilityDocument = ProviderAvailability & import('mongoose').Document;

@Injectable()
export class ProviderAvailabilityRepository extends MongoRepository<ProviderAvailabilityDocument> {
  constructor(@InjectModel(ProviderAvailability.name) model: Model<ProviderAvailabilityDocument>) {
    super(model);
  }
}
