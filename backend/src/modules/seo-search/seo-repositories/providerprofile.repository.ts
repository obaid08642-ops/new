import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  ProviderProfile  } from '../../../schemas/provider-profile.schema';

@Injectable()
export class ProviderProfileRepository extends MongoRepository<any> {
  constructor(@InjectModel(ProviderProfile.name) model: Model<any>) {
    super(model);
  }
}
