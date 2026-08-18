import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  NursingVisitReport  } from '../../../schemas/home-care.schema';

@Injectable()
export class NursingVisitReportRepository extends MongoRepository<NursingVisitReport> {
  constructor(@InjectModel(NursingVisitReport.name) model: Model<NursingVisitReport>) {
    super(model);
  }
}
