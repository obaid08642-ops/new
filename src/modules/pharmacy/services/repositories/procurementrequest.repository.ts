import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProcurementRequest, ProcurementRequestDocument } from '../../schemas/procurement-request.schema';

@Injectable()
export class ProcurementRequestRepository extends MongoRepository<ProcurementRequestDocument> {
  constructor(@InjectModel(ProcurementRequest.name) model: Model<ProcurementRequestDocument>) {
    super(model);
  }
}
