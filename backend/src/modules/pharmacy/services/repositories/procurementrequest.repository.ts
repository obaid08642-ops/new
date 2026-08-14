// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProcurementRequest } from '../../schemas/procurement-request.schema';

@Injectable()
export class ProcurementRequestRepository extends MongoRepository<ProcurementRequest> {
  constructor(@InjectModel(ProcurementRequest.name) model: Model<ProcurementRequest>) {
    super(model);
  }
}
