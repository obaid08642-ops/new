import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { FraudAlertDocument } from '../../../schemas/fraud-alert.schema';
export declare class FraudAlertRepository extends MongoRepository<FraudAlertDocument> {
    constructor(model: Model<FraudAlertDocument>);
}
