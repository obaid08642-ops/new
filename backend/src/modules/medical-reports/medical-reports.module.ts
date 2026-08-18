import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicalReportsController } from './medical-reports.controller';
import { MedicalReportsService } from './medical-reports.service';
import { MedicalReportSchema } from '../../schemas/medical-report.schema';
import { MedicalReportRepository } from "./repositories/medicalreport.repository";

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'MedicalReport', schema: MedicalReportSchema },
  ])],
  controllers: [MedicalReportsController],
  providers: [MedicalReportsService, { provide: 'MedicalReportRepository', useClass: MedicalReportRepository }],
  exports: [MedicalReportsService],
})
export class MedicalReportsModule {}
