// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  PharmacyInventory, PharmacyInventoryDocument  } from '../../../schemas/inventory.schema';

@Injectable()
export class PharmacyInventoryRepository extends MongoRepository<PharmacyInventoryDocument> {
  constructor(@InjectModel(PharmacyInventory.name) model: Model<PharmacyInventoryDocument>) {
    super(model);
  }
}
