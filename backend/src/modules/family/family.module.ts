import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FamilyService } from './family.service';
import { FamilyController } from './family.controller';
import {
  FamilyGroupSchema,
  SharedCalendarEventSchema,
  FamilyPermissionRequestSchema,
} from '../../schemas/family.schemas';
import { FamilyGroupRepository } from "./repositories/familygroup.repository";
import { FamilyPermissionRequestRepository } from "./repositories/familypermissionrequest.repository";
import { SharedCalendarEventRepository } from "./repositories/sharedcalendarevent.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FamilyGroup', schema: FamilyGroupSchema },
      { name: 'SharedCalendarEvent', schema: SharedCalendarEventSchema },
      { name: 'FamilyPermissionRequest', schema: FamilyPermissionRequestSchema },
    ]),
  ],
  controllers: [FamilyController],
  providers: [FamilyService, { provide: 'FamilyGroupRepository', useClass: FamilyGroupRepository }, { provide: 'FamilyPermissionRequestRepository', useClass: FamilyPermissionRequestRepository }, { provide: 'SharedCalendarEventRepository', useClass: SharedCalendarEventRepository }],
  exports: [FamilyService],
})
export class FamilyModule {}
