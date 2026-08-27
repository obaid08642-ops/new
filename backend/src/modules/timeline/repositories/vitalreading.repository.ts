import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  VitalReading  } from '../../../schemas/health.schema';

@Injectable()
export class VitalReadingRepository extends MongoRepository<any> {
  constructor(@InjectModel(VitalReading.name) model: Model<any>) {
    super(model);
  }
}
