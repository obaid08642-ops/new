import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { PharmacyChatMessage } from '../../schemas/pharmacy.schema';

@Injectable()
export class PharmacyChatMessageRepository extends MongoRepository<PharmacyChatMessage> {
  constructor(@InjectModel(PharmacyChatMessage.name) model: Model<PharmacyChatMessage>) {
    super(model);
  }
}
