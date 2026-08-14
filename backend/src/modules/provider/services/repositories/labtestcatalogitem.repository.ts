// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { LabTestCatalogItem } from '../../schemas';

@Injectable()
export class LabTestCatalogItemRepository extends MongoRepository<LabTestCatalogItem> {
  constructor(@InjectModel(LabTestCatalogItem.name) model: Model<LabTestCatalogItem>) {
    super(model);
  }
}
