import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { CorporateAccountDocument } from '../../../schemas/corporate-account.schema';
export declare class CorporateAccountRepository extends MongoRepository<CorporateAccountDocument> {
    constructor(model: Model<CorporateAccountDocument>);
}
