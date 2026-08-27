import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
// Ensure correct import
import {  Wallet, WalletDocument  } from '../../../schemas/wallet.schema';

@Injectable()
export class WalletRepository extends MongoRepository<WalletDocument> {
  constructor(@InjectModel(Wallet.name) model: Model<WalletDocument>) {
    super(model);
  }
}
