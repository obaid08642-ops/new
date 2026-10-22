import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { Permission, RequirePermissions } from '../../../common/permissions';
import { UserRole } from '../../../common/enums';
import { MedicalAccessLogService } from '../../../common/pdpl-compliance.module';

const ID = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * 16.9 - read-only view of who viewed which medical record. Nothing here writes or deletes; the rows are written by the
 * services that serve the records and leave the collection only through its retention TTL.
 */
@Controller('admin/medical-access-log')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminMedicalAccessController {
  constructor(private readonly access: MedicalAccessLogService) {}

  @Get()
  @RequirePermissions(Permission.MEDICAL_ACCESS_LOG_VIEW)
  async list(
    @Query('patient_id') patientId?: string,
    @Query('actor_id') actorId?: string,
    @Query('record_kind') recordKind?: string,
    @Query('limit') limit?: string,
  ) {
    for (const v of [patientId, actorId, recordKind]) if (v !== undefined && !ID.test(v)) throw new BadRequestException('invalid_filter');
    const rows = await this.access.timeline(
      { id: 'admin', role: 'admin' },
      { patient_id: patientId, actor_id: actorId, record_kind: recordKind, limit: limit ? parseInt(limit, 10) : undefined },
    );
    return { count: rows.length, data: rows };
  }
}
