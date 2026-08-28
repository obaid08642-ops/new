import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { EmergencyRequestDocument } from '../../../schemas/emergency.schema';
export declare class EmergencyRequestRepository extends MongoRepository<EmergencyRequestDocument> {
    constructor(model: Model<EmergencyRequestDocument>);
}
