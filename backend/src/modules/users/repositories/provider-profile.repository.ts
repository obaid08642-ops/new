// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import {  ProviderProfile, ProviderProfileDocument  } from '../../../schemas/provider-profile.schema';

@Injectable()
export class ProviderProfileRepository extends MongoRepository<ProviderProfileDocument> {
  constructor(@InjectModel(ProviderProfile.name) model: Model<ProviderProfileDocument>) {
    super(model);
  }
}
