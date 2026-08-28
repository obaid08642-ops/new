import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { DoctorSessionType } from '../../schemas';
export declare class DoctorSessionTypeRepository extends MongoRepository<DoctorSessionType> {
    constructor(model: Model<DoctorSessionType>);
}
