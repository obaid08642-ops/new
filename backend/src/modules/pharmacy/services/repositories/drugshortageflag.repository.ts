// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { DrugShortageFlag } from '../../schemas/pharmacy.schema';

@Injectable()
export class DrugShortageFlagRepository extends MongoRepository<DrugShortageFlag> {
  constructor(@InjectModel(DrugShortageFlag.name) model: Model<DrugShortageFlag>) {
    super(model);
  }
}
