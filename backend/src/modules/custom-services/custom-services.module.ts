import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomServicesController } from './custom-services.controller';
import { CustomServicesService } from './custom-services.service';
import { CustomServiceRequestSchema } from '../../schemas/custom-service.schema';
import { CustomServiceRequestRepository } from "./repositories/customservicerequest.repository";

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'CustomServiceRequest', schema: CustomServiceRequestSchema },
  ])],
  controllers: [CustomServicesController],
  providers: [CustomServicesService, { provide: 'CustomServiceRequestRepository', useClass: CustomServiceRequestRepository }],
})
export class CustomServicesModule {}
