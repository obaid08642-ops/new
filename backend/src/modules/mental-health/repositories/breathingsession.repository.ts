// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  BreathingSession, BreathingSessionDocument  } from '../../../schemas/mental-health.schema';

@Injectable()
export class BreathingSessionRepository extends MongoRepository<BreathingSessionDocument> {
  constructor(@InjectModel(BreathingSession.name) model: Model<BreathingSessionDocument>) {
    super(model);
  }
}
