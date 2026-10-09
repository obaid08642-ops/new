import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AuditEvent, AuditEventSchema } from './schemas/audit-event.schema';
import { RetentionPolicy, RetentionPolicySchema } from './schemas/retention-policy.schema';
import { AUDIT_QUEUE_NAME, AuditTrailService } from './audit-trail.service';
import { AuditTrailProcessor } from './audit-trail.processor';
import { AuditIntakeController } from './audit-intake.controller';
import { AdminAuditController } from './admin-audit.controller';
import { PatientAuditController } from './patient-audit.controller';
import { RetentionJob } from './retention.job';
import { ArchiveJob } from './archive.job';

/**
 * Phase 23 — AuditTrailModule.
 *
 * Self-contained on purpose: it imports no other feature module (only
 * Mongoose + the shared `audit-trail` BullMQ queue), so registering it in
 * app.module.ts cannot introduce a circular dependency. Domain modules reach
 * the trail through the `audit.record` event (`emitAudit`), never by
 * importing this module.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditEvent.name, schema: AuditEventSchema },
      { name: RetentionPolicy.name, schema: RetentionPolicySchema },
    ]),
    BullModule.registerQueue({ name: AUDIT_QUEUE_NAME }),
  ],
  controllers: [AuditIntakeController, AdminAuditController, PatientAuditController],
  providers: [AuditTrailService, AuditTrailProcessor, RetentionJob, ArchiveJob],
  exports: [AuditTrailService, RetentionJob],
})
export class AuditTrailModule {}
