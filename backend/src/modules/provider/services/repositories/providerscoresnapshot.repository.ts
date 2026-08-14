// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderScoreSnapshot } from '../../schemas';

@Injectable()
export class ProviderScoreSnapshotRepository extends MongoRepository<ProviderScoreSnapshot> {
  constructor(@InjectModel(ProviderScoreSnapshot.name) model: Model<ProviderScoreSnapshot>) {
    super(model);
  }
}
