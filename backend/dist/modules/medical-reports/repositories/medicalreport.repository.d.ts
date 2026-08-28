import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MedicalReport } from '../../../schemas/medical-report.schema';
export declare class MedicalReportRepository extends MongoRepository<MedicalReport> {
    constructor(model: Model<MedicalReport>);
}
