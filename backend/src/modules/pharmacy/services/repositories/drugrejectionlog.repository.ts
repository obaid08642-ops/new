import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import {  DrugRejectionLog, DrugRejectionLogDocument  } from '../../../../schemas/drug-rejection-log.schema';

@Injectable()
export class DrugRejectionLogRepository extends MongoRepository<DrugRejectionLogDocument> {
  constructor(@InjectModel(DrugRejectionLog.name) model: Model<DrugRejectionLogDocument>) {
    super(model);
  }
}
