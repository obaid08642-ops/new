// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderProfile } from '../../../provider/schemas';

@Injectable()
export class ProviderAccountProfileRepository extends MongoRepository<ProviderProfile> {
  constructor(@InjectModel('ProviderProfile') model: Model<ProviderProfile>) {
    super(model);
  }
}
