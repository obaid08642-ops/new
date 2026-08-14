import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProviderSession } from '../../schemas';
import { MongoRepository } from '../../../../common/database/mongo.repository';

@Injectable()
export class ProviderSessionRepository extends MongoRepository<ProviderSession> {
  constructor(@InjectModel(ProviderSession.name) model: Model<ProviderSession>) {
    super(model);
  }
}
