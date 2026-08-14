// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  ExerciseLog, ExerciseLogDocument  } from '../../../schemas/nutrition.schema';

@Injectable()
export class ExerciseLogRepository extends MongoRepository<ExerciseLogDocument> {
  constructor(@InjectModel(ExerciseLog.name) model: Model<ExerciseLogDocument>) {
    super(model);
  }
}
