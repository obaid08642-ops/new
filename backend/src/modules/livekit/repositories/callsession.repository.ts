// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import { CallSession, CallSessionDocument } from '../../../schemas/callsession.schema';

@Injectable()
export class CallSessionRepository extends MongoRepository<CallSessionDocument> {
  constructor(@InjectModel(CallSession.name) model: Model<CallSessionDocument>) {
    super(model);
  }
}
