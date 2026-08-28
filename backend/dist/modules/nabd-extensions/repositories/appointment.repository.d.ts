import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { AppointmentDocument } from '../../../schemas/extra.schemas';
export declare class AppointmentRepository extends MongoRepository<AppointmentDocument> {
    constructor(model: Model<AppointmentDocument>);
}
