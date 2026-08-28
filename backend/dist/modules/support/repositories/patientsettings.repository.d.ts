import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { PatientSettings } from '../../../schemas/support.schema';
export declare class PatientSettingsRepository extends MongoRepository<PatientSettings> {
    constructor(model: Model<PatientSettings>);
}
