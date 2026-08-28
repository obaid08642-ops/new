import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderOtpCode } from '../../schemas';

@Injectable()
export class ProviderOtpCodeRepository extends MongoRepository<ProviderOtpCode> {
  constructor(@InjectModel(ProviderOtpCode.name) model: Model<ProviderOtpCode>) {
    super(model);
  }
}
