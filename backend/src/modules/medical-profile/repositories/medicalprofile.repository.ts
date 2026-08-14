// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  MedicalProfile  } from '../../../schemas/medical-profile.schema';

@Injectable()
export class MedicalProfileRepository extends MongoRepository<MedicalProfile> {
  constructor(@InjectModel(MedicalProfile.name) model: Model<MedicalProfile>) {
    super(model);
  }
}
