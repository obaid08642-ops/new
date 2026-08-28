import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MedicalProfile } from '../../../schemas/medical-profile.schema';
export declare class MedicalProfileRepository extends MongoRepository<MedicalProfile> {
    constructor(model: Model<MedicalProfile>);
}
