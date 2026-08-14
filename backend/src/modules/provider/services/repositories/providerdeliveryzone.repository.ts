// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderDeliveryZone } from '../../schemas';

@Injectable()
export class ProviderDeliveryZoneRepository extends MongoRepository<ProviderDeliveryZone> {
  constructor(@InjectModel(ProviderDeliveryZone.name) model: Model<ProviderDeliveryZone>) {
    super(model);
  }
}
