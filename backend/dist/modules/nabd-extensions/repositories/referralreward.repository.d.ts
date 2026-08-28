import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { ReferralRewardDocument } from '../../../schemas/referral.schema';
export declare class ReferralRewardRepository extends MongoRepository<ReferralRewardDocument> {
    constructor(model: Model<ReferralRewardDocument>);
}
