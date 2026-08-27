import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmergencyController } from './emergency.controller';
import { EmergencyService } from './emergency.service';
import { EmergencyRequest, EmergencyRequestSchema } from '../../schemas/emergency.schema';
import { EmergencyRequestRepository } from "./repositories/emergencyrequest.repository";
import { AmbulanceVehicle, AmbulanceVehicleSchema } from '../../schemas/ambulance-vehicle.schema';
import { AmbulanceFleetService, ProviderAmbulanceFleetController, AdminAmbulanceFleetController } from './ambulance-fleet.controller';

@Module({
  imports: [MongooseModule.forFeature([
    { name: EmergencyRequest.name, schema: EmergencyRequestSchema },
    { name: AmbulanceVehicle.name, schema: AmbulanceVehicleSchema },
  ])],
  controllers: [EmergencyController, ProviderAmbulanceFleetController, AdminAmbulanceFleetController],
  providers: [EmergencyService, AmbulanceFleetService, { provide: 'EmergencyRequestRepository', useClass: EmergencyRequestRepository }],
  exports: [EmergencyService],
})
export class EmergencyModule {}
