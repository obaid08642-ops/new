import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  FraudAlert, FraudAlertDocument  } from '../../../schemas/fraud-alert.schema';

@Injectable()
export class FraudAlertRepository extends MongoRepository<FraudAlertDocument> {
  constructor(@InjectModel(FraudAlert.name) model: Model<FraudAlertDocument>) {
    super(model);
  }
}
