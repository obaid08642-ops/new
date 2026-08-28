import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderBankAccount } from '../../schemas';
export declare class ProviderBankAccountRepository extends MongoRepository<ProviderBankAccount> {
    constructor(model: Model<ProviderBankAccount>);
}
