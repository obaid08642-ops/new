import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { CallSessionDocument } from '../../../schemas/callsession.schema';
export declare class CallSessionRepository extends MongoRepository<CallSessionDocument> {
    constructor(model: Model<CallSessionDocument>);
}
