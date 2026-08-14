// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  MeditationSession, MeditationSessionDocument  } from '../../../schemas/mental-health.schema';

@Injectable()
export class MeditationSessionRepository extends MongoRepository<MeditationSessionDocument> {
  constructor(@InjectModel(MeditationSession.name) model: Model<MeditationSessionDocument>) {
    super(model);
  }
}
