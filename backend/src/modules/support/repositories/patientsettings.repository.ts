// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  PatientSettings  } from '../../../schemas/support.schema';

@Injectable()
export class PatientSettingsRepository extends MongoRepository<PatientSettings> {
  constructor(@InjectModel(PatientSettings.name) model: Model<PatientSettings>) {
    super(model);
  }
}
