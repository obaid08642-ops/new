// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  EmergencyRequest, EmergencyRequestDocument  } from '../../../schemas/emergency.schema';

@Injectable()
export class EmergencyRequestRepository extends MongoRepository<EmergencyRequestDocument> {
  constructor(@InjectModel(EmergencyRequest.name) model: Model<EmergencyRequestDocument>) {
    super(model);
  }
}
