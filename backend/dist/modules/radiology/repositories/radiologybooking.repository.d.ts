import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { RadiologyBooking } from '../../../schemas/radiology.schema';
export declare class RadiologyBookingRepository extends MongoRepository<RadiologyBooking> {
    constructor(model: Model<RadiologyBooking>);
}
