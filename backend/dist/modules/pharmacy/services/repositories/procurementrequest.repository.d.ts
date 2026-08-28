import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProcurementRequestDocument } from '../../schemas/procurement-request.schema';
export declare class ProcurementRequestRepository extends MongoRepository<ProcurementRequestDocument> {
    constructor(model: Model<ProcurementRequestDocument>);
}
