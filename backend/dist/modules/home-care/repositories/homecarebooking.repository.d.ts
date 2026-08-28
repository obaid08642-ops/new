import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { HomeCareBooking } from '../../../schemas/home-care.schema';
export declare class HomeCareBookingRepository extends MongoRepository<HomeCareBooking> {
    constructor(model: Model<HomeCareBooking>);
}
