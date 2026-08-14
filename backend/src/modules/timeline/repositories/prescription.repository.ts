// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Prescription, any  } from '../../../schemas/prescription.schema';

@Injectable()
export class PrescriptionRepository extends MongoRepository<any> {
  constructor(@InjectModel(Prescription.name) model: Model<any>) {
    super(model);
  }
}
