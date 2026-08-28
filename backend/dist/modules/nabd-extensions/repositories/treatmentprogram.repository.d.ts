import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { TreatmentProgramDocument } from '../../../schemas/treatment-program.schema';
export declare class TreatmentProgramRepository extends MongoRepository<TreatmentProgramDocument> {
    constructor(model: Model<TreatmentProgramDocument>);
}
