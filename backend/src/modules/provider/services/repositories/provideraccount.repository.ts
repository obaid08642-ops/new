// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderAccount } from '../../schemas';

@Injectable()
export class ProviderAccountRepository extends MongoRepository<ProviderAccount> {
  constructor(@InjectModel(ProviderAccount.name) model: Model<ProviderAccount>) {
    super(model);
  }
}
