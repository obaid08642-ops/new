// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { PharmacyInventoryItem } from '../../schemas';

@Injectable()
export class PharmacyInventoryItemRepository extends MongoRepository<PharmacyInventoryItem> {
  constructor(@InjectModel(PharmacyInventoryItem.name) model: Model<PharmacyInventoryItem>) {
    super(model);
  }
}
