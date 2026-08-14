// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  SlaLog, SlaLogDocument  } from '../../../schemas/sla-log.schema';

@Injectable()
export class SlaLogRepository extends MongoRepository<SlaLogDocument> {
  constructor(@InjectModel(SlaLog.name) model: Model<SlaLogDocument>) {
    super(model);
  }
}
