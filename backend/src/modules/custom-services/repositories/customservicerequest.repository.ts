// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  CustomServiceRequest  } from '../../../schemas/custom-service.schema';

@Injectable()
export class CustomServiceRequestRepository extends MongoRepository<CustomServiceRequest> {
  constructor(@InjectModel(CustomServiceRequest.name) model: Model<CustomServiceRequest>) {
    super(model);
  }
}
