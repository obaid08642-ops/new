// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderOperator } from '../../schemas';

@Injectable()
export class ProviderOperatorRepository extends MongoRepository<ProviderOperator> {
  constructor(@InjectModel(ProviderOperator.name) model: Model<ProviderOperator>) {
    super(model);
  }
}
