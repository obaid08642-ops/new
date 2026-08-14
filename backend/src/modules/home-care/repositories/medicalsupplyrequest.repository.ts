// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  MedicalSupplyRequest  } from '../../../schemas/home-care.schema';

@Injectable()
export class MedicalSupplyRequestRepository extends MongoRepository<MedicalSupplyRequest> {
  constructor(@InjectModel(MedicalSupplyRequest.name) model: Model<MedicalSupplyRequest>) {
    super(model);
  }
}
