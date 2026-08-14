// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  TreatmentProgram, TreatmentProgramDocument  } from '../../../schemas/treatment-program.schema';

@Injectable()
export class TreatmentProgramRepository extends MongoRepository<TreatmentProgramDocument> {
  constructor(@InjectModel(TreatmentProgram.name) model: Model<TreatmentProgramDocument>) {
    super(model);
  }
}
