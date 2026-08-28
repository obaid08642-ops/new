import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { NursingVisitReport } from '../../../schemas/home-care.schema';
export declare class NursingVisitReportRepository extends MongoRepository<NursingVisitReport> {
    constructor(model: Model<NursingVisitReport>);
}
