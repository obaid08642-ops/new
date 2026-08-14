// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  MedicalReport, any  } from '../../../schemas/medical-report.schema';

@Injectable()
export class MedicalReportRepository extends MongoRepository<any> {
  constructor(@InjectModel(MedicalReport.name) model: Model<any>) {
    super(model);
  }
}
