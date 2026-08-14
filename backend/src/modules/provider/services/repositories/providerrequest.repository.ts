// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderRequest } from '../../schemas';

@Injectable()
export class ProviderRequestRepository extends MongoRepository<ProviderRequest> {
  constructor(@InjectModel(ProviderRequest.name) model: Model<ProviderRequest>) {
    super(model);
  }
}
