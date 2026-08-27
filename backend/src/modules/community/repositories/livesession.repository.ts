import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  LiveSession  } from '../../../schemas/community.schemas';

@Injectable()
export class LiveSessionRepository extends MongoRepository<any> {
  constructor(@InjectModel(LiveSession.name) model: Model<any>) {
    super(model);
  }
}
