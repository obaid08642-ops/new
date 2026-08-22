import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderAuditLog } from '../../schemas';

@Injectable()
export class ProviderAuditLogRepository extends MongoRepository<ProviderAuditLog> {
  constructor(@InjectModel(ProviderAuditLog.name) model: Model<ProviderAuditLog>) {
    super(model);
  }
}
