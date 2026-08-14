// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import {  PatientProfile, PatientProfileDocument  } from '../../../schemas/patient-profile.schema';

@Injectable()
export class PatientProfileRepository extends MongoRepository<PatientProfileDocument> {
  constructor(@InjectModel(PatientProfile.name) model: Model<PatientProfileDocument>) {
    super(model);
  }
}
