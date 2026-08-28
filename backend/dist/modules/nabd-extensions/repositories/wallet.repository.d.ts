import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { WalletDocument } from '../../../schemas/wallet.schema';
export declare class WalletRepository extends MongoRepository<WalletDocument> {
    constructor(model: Model<WalletDocument>);
}
