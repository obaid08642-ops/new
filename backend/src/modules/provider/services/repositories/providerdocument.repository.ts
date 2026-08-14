// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderDocument } from '../../schemas';

@Injectable()
export class ProviderDocumentRepository extends MongoRepository<ProviderDocument> {
  constructor(@InjectModel(ProviderDocument.name) model: Model<ProviderDocument>) {
    super(model);
  }
}
