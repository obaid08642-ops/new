import { Global, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AdminAuditService } from '../admin/enterprise/audit.service';
import { EmergencyMaintenanceMiddleware } from './emergency-maintenance.middleware';
import { KillSwitchesController } from './kill-switches.controller';
import { KillSwitchesService } from './kill-switches.service';

/** Global so every service that starts a switchable action can inject KillSwitchesService (as @Optional). */
@Global()
@Module({
  controllers: [KillSwitchesController],
  providers: [KillSwitchesService, AdminAuditService, EmergencyMaintenanceMiddleware],
  exports: [KillSwitchesService],
})
export class KillSwitchesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(EmergencyMaintenanceMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
