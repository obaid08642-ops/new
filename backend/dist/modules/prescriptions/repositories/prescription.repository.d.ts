import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { PrescriptionDocument } from '../../../schemas/prescription.schema';
export declare class PrescriptionRepository extends MongoRepository<PrescriptionDocument> {
    constructor(model: Model<PrescriptionDocument>);
}
