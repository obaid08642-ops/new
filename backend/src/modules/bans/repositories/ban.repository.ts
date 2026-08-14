// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import { Ban, BanDocument } from '../bans.schema';

@Injectable()
export class BanRepository extends MongoRepository<BanDocument> {
  constructor(@InjectModel(Ban.name) model: Model<BanDocument>) {
    super(model);
  }
}
