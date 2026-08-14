// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { Quotation } from '../../schemas/quotation.schema';

@Injectable()
export class QuotationRepository extends MongoRepository<Quotation> {
  constructor(@InjectModel('Quotation') model: Model<Quotation>) {
    super(model);
  }
}
