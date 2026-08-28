import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { ReferralCodeDocument } from '../../../schemas/referral.schema';
export declare class ReferralCodeRepository extends MongoRepository<ReferralCodeDocument> {
    constructor(model: Model<ReferralCodeDocument>);
}
