import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Reward  } from '../../../schemas/loyalty.schemas';

@Injectable()
export class RewardRepository extends MongoRepository<any> {
  constructor(@InjectModel(Reward.name) model: Model<any>) {
    super(model);
  }
}
