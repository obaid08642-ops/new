import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { BreathingSessionDocument } from '../../../schemas/mental-health.schema';
export declare class BreathingSessionRepository extends MongoRepository<BreathingSessionDocument> {
    constructor(model: Model<BreathingSessionDocument>);
}
