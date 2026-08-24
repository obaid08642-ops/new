import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  LabSample  } from '../../../schemas/lab.schema';

@Injectable()
export class LabSampleRepository extends MongoRepository<LabSample> {
  constructor(@InjectModel(LabSample.name) model: Model<LabSample>) {
    super(model);
  }
}
