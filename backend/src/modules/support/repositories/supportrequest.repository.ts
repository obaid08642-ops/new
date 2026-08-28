import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  SupportRequest  } from '../../../schemas/support.schema';

@Injectable()
export class SupportRequestRepository extends MongoRepository<SupportRequest> {
  constructor(@InjectModel(SupportRequest.name) model: Model<SupportRequest>) {
    super(model);
  }
}
