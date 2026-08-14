// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  LabResult  } from '../../../schemas/lab-result.schema';

@Injectable()
export class LabResultRepository extends MongoRepository<LabResult> {
  constructor(@InjectModel(LabResult.name) model: Model<LabResult>) {
    super(model);
  }
}
