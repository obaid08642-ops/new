import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { WalletTransactionDocument } from '../../../schemas/wallet.schema';
export declare class WalletTransactionRepository extends MongoRepository<WalletTransactionDocument> {
    constructor(model: Model<WalletTransactionDocument>);
}
