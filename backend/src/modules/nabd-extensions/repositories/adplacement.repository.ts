import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  AdPlacement, AdPlacementDocument  } from '../../../schemas/ad-placement.schema';

@Injectable()
export class AdPlacementRepository extends MongoRepository<AdPlacementDocument> {
  constructor(@InjectModel(AdPlacement.name) model: Model<AdPlacementDocument>) {
    super(model);
  }
}
