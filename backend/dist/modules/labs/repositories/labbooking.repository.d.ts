import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { LabBooking } from '../../../schemas/lab.schema';
export declare class LabBookingRepository extends MongoRepository<LabBooking> {
    constructor(model: Model<LabBooking>);
}
