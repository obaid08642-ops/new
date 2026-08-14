// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  WalletTransaction, WalletTransactionDocument  } from '../../../schemas/wallet.schema';

@Injectable()
export class WalletTransactionRepository extends MongoRepository<WalletTransactionDocument> {
  constructor(@InjectModel(WalletTransaction.name) model: Model<WalletTransactionDocument>) {
    super(model);
  }
}
