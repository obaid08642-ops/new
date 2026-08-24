import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  SleepReading  } from '../../../schemas/health.schema';

@Injectable()
export class SleepReadingRepository extends MongoRepository<SleepReading> {
  constructor(@InjectModel(SleepReading.name) model: Model<SleepReading>) {
    super(model);
  }
}
