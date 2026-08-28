import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { CarePlan } from '../../../schemas/home-care.schema';
export declare class CarePlanRepository extends MongoRepository<CarePlan> {
    constructor(model: Model<CarePlan>);
}
