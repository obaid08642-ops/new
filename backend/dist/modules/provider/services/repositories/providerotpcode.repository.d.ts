import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderOtpCode } from '../../schemas';
export declare class ProviderOtpCodeRepository extends MongoRepository<ProviderOtpCode> {
    constructor(model: Model<ProviderOtpCode>);
}
