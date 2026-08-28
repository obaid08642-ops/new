import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  UniversalActivity, UniversalActivityDocument  } from '../../../schemas/universal-activity.schema';

@Injectable()
export class UniversalActivityRepository extends MongoRepository<UniversalActivityDocument> {
  constructor(@InjectModel(UniversalActivity.name) model: Model<UniversalActivityDocument>) {
    super(model);
  }
}
