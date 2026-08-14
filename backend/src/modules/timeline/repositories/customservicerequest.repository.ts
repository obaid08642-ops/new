// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  CustomServiceRequest, any  } from '../../../schemas/custom-service.schema';

@Injectable()
export class CustomServiceRequestRepository extends MongoRepository<any> {
  constructor(@InjectModel(CustomServiceRequest.name) model: Model<any>) {
    super(model);
  }
}
