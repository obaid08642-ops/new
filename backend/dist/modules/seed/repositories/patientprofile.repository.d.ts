import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { PatientProfileDocument } from '../../../schemas/patient-profile.schema';
export declare class PatientProfileRepository extends MongoRepository<PatientProfileDocument> {
    constructor(model: Model<PatientProfileDocument>);
}
