// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  ReturnRequest  } from '../../../schemas/returns.schema';

@Injectable()
export class ReturnRequestRepository extends MongoRepository<ReturnRequest> {
  constructor(@InjectModel(ReturnRequest.name) model: Model<ReturnRequest>) {
    super(model);
  }
}
