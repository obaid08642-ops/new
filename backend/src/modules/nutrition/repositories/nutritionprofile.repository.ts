import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  NutritionProfile, NutritionProfileDocument  } from '../../../schemas/nutrition.schema';

@Injectable()
export class NutritionProfileRepository extends MongoRepository<NutritionProfileDocument> {
  constructor(@InjectModel(NutritionProfile.name) model: Model<NutritionProfileDocument>) {
    super(model);
  }
}
