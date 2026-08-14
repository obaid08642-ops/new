// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  SelfAssessment, SelfAssessmentDocument  } from '../../../schemas/mental-health.schema';

@Injectable()
export class SelfAssessmentRepository extends MongoRepository<SelfAssessmentDocument> {
  constructor(@InjectModel(SelfAssessment.name) model: Model<SelfAssessmentDocument>) {
    super(model);
  }
}
