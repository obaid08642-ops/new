import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  CorporateAccount, CorporateAccountDocument  } from '../../../schemas/corporate-account.schema';

@Injectable()
export class CorporateAccountRepository extends MongoRepository<CorporateAccountDocument> {
  constructor(@InjectModel(CorporateAccount.name) model: Model<CorporateAccountDocument>) {
    super(model);
  }
}
