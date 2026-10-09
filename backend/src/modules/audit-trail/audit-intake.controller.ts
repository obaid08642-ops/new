import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { AuditTrailService } from './audit-trail.service';

class ActorDto {
  @IsOptional() @IsString() id?: string;
  @IsString() role: string;
  @IsOptional() @IsObject() impersonator?: { id?: string; role?: string };
}

class EntityDto {
  @IsString() type: string;
  @IsOptional() @IsString() id?: string;
}

/**
 * Phase 23 — trusted intake. Any authenticated actor (including MCP agents
 * presenting a service credential, 23.1) may submit an event; server time,
 * IP and request id are always filled by the backend, never trusted.
 */
export class RecordAuditEventDto {
  @IsString() action: string;
  @IsOptional() @ValidateNested() @Type(() => ActorDto) actor?: ActorDto;
  @IsOptional() @ValidateNested() @Type(() => EntityDto) entity?: EntityDto;
  @IsOptional() @IsObject() diff?: { before?: any; after?: any };
  @IsOptional() @IsObject() where?: { device_id?: string; platform?: string; app_version?: string };
  @IsOptional() @IsString() why?: string;
  @IsOptional() @IsString() category?: string;
}

/** POST /api/v1/audit/events */
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditIntakeController {
  constructor(private readonly audit: AuditTrailService) {}

  @Post('events')
  async record(@Body() dto: RecordAuditEventDto, @CurrentUser() user: any, @Req() req: any) {
    const actor = dto.actor || { id: user?.id, role: String(user?.role || 'unknown') };
    await this.audit.record({
      action: dto.action,
      actor: {
        id: actor.id || user?.id,
        role: actor.role || String(user?.role || 'unknown'),
        impersonator: (actor as any).impersonator || (req as any).impersonator || undefined,
      },
      entity: dto.entity,
      diff: dto.diff,
      where: {
        ip: req?.ip || req?.socket?.remoteAddress,
        device_id: dto.where?.device_id || req?.headers?.['x-device-id'],
        user_agent: req?.headers?.['user-agent'],
        platform: dto.where?.platform || req?.headers?.['x-platform'],
        app_version: dto.where?.app_version || req?.headers?.['x-app-version'],
      },
      why: dto.why,
      request_id: (req as any)?.correlation_id || req?.headers?.['x-request-id'],
      category: dto.category,
    });
    return { ok: true };
  }
}
