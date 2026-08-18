import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderScheduleSlot } from '../../schemas';

@Injectable()
export class ProviderScheduleSlotRepository extends MongoRepository<ProviderScheduleSlot> {
  constructor(@InjectModel(ProviderScheduleSlot.name) model: Model<ProviderScheduleSlot>) {
    super(model);
  }
}
