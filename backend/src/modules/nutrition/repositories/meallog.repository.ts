// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  MealLog, MealLogDocument  } from '../../../schemas/nutrition.schema';

@Injectable()
export class MealLogRepository extends MongoRepository<MealLogDocument> {
  constructor(@InjectModel(MealLog.name) model: Model<MealLogDocument>) {
    super(model);
  }
}
