import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
// Ensure correct import
import { ProviderAssignmentAttempt } from '../../schemas';

@Injectable()
export class ProviderAssignmentAttemptRepository extends MongoRepository<ProviderAssignmentAttempt> {
  constructor(@InjectModel(ProviderAssignmentAttempt.name) model: Model<ProviderAssignmentAttempt>) {
    super(model);
  }
}
