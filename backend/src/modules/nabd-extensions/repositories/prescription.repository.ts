// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Prescription, PrescriptionDocument  } from '../../../schemas/prescription.schema';

@Injectable()
export class PrescriptionRepository extends MongoRepository<PrescriptionDocument> {
  constructor(@InjectModel(Prescription.name) model: Model<PrescriptionDocument>) {
    super(model);
  }
}
