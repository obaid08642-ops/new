import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  MoodEntry, MoodEntryDocument  } from '../../../schemas/mental-health.schema';

@Injectable()
export class MoodEntryRepository extends MongoRepository<MoodEntryDocument> {
  constructor(@InjectModel(MoodEntry.name) model: Model<MoodEntryDocument>) {
    super(model);
  }
}
