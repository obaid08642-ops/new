import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import { CallMetric, CallMetricDocument } from '../../../schemas/callmetric.schema';

@Injectable()
export class CallMetricRepository extends MongoRepository<CallMetricDocument> {
  constructor(@InjectModel(CallMetric.name) model: Model<CallMetricDocument>) {
    super(model);
  }
}
