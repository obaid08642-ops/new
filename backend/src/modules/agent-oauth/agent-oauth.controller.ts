import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, VERSION_NEUTRAL } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AgentOAuthService } from './agent-oauth.service';
import { authorizationServerMetadata, protectedResourceMetadata } from './agent-oauth.constants';
import {
  AdminCreateAgentClientDto, AdminUpdateAgentClientDto, AgentActivityQueryDto, AuthorizeDecisionDto, AuthorizeQueryDto,
  RegisterClientDto, RevokeRequestDto, TokenRequestDto,
} from './agent-oauth.dto';

import { Permission, RequirePermissions } from '../../common/permissions';
/** RFC 8414 + RFC 9728 discovery documents, served at the host root (no /api prefix). */
@Controller({ path: '.well-known', version: VERSION_NEUTRAL })
export class AgentOAuthWellKnownController {
  @Public()
  @Get('oauth-authorization-server')
  @Header('Access-Control-Allow-Origin', '*')
  authorizationServer() {
    return authorizationServerMetadata();
  }

  @Public()
  @Get('oauth-protected-resource')
  @Header('Access-Control-Allow-Origin', '*')
  protectedResource() {
    return protectedResourceMetadata();
  }

  /** RFC 9728 §3.1 path-inserted form for the MCP endpoint. */
  @Public()
  @Get('oauth-protected-resource/api/v1/mcp')
  @Header('Access-Control-Allow-Origin', '*')
  protectedResourceMcp() {
    return protectedResourceMetadata();
  }
}

@Controller('oauth')
export class AgentOAuthController {
  constructor(private readonly oauth: AgentOAuthService) {}

  /** Same document as /.well-known/oauth-authorization-server (the patient web serves it from here). */
  @Public()
  @Get('metadata')
  metadata() {
    return authorizationServerMetadata();
  }

  /** Same document as the RFC 9728 well-known for the MCP resource. */
  @Public()
  @Get('protected-resource')
  protectedResource() {
    return protectedResourceMetadata();
  }

  @Public()
  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  register(@Body() body: RegisterClientDto) {
    return this.oauth.register(body);
  }

  /** Consent data for the patient web's consent page. */
  @Roles(UserRole.PATIENT)
  @Get('authorize')
  consent(@CurrentUser('id') patientId: string, @Query() q: AuthorizeQueryDto) {
    return this.oauth.consentData(patientId, q);
  }

  @Roles(UserRole.PATIENT)
  @Post('authorize')
  @HttpCode(200)
  decide(@CurrentUser('id') patientId: string, @Body() body: AuthorizeDecisionDto) {
    const { decision, ...params } = body;
    return this.oauth.decide(patientId, params, decision);
  }

  @Public()
  @Post('token')
  @HttpCode(200)
  @Header('Pragma', 'no-cache')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  token(@Body() body: TokenRequestDto) {
    return this.oauth.token(body as unknown as Record<string, string | undefined>);
  }

  @Public()
  @Post('revoke')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  revoke(@Body() body: RevokeRequestDto) {
    return this.oauth.revoke(body.token, body.client_id);
  }
}

/** The patient's "Connected AI apps" (the settings UI is built by the design session). */
@Controller('patient/agent-connections')
@Roles(UserRole.PATIENT)
export class PatientAgentConnectionsController {
  constructor(private readonly oauth: AgentOAuthService) {}

  @Get()
  list(@CurrentUser('id') patientId: string) {
    return this.oauth.listConnections(patientId);
  }

  @Delete(':clientId')
  revoke(@CurrentUser('id') patientId: string, @Param('clientId') clientId: string) {
    return this.oauth.revokeConnection(patientId, clientId);
  }
}

/** Admin-managed client list: pre-registered clients, and blocking a client. */
@Controller('admin/agent-clients')
@Roles(UserRole.ADMIN)
export class AdminAgentClientsController {
  constructor(private readonly oauth: AgentOAuthService) {}

  @Get()
  list() {
    return this.oauth.adminList();
  }

  @RequirePermissions(Permission.SECURITY_MANAGE)
  @Post()
  create(@Body() body: AdminCreateAgentClientDto) {
    return this.oauth.adminCreate(body);
  }

  @RequirePermissions(Permission.SECURITY_MANAGE)
  @Patch(':clientId')
  update(@Param('clientId') clientId: string, @Body() body: AdminUpdateAgentClientDto) {
    return this.oauth.adminSetBlocked(clientId, body.blocked);
  }
}

/**
 * AC-6: admin view of agent activity, with filters by client, patient and tool.
 * Backend only; the UI ("agent activity" admin page) goes to the design session.
 */
@Controller('admin/agent-activity')
@Roles(UserRole.ADMIN)
export class AgentActivityController {
  constructor(private readonly oauth: AgentOAuthService) {}

  @Get()
  list(@Query() q: AgentActivityQueryDto) {
    return this.oauth.listAgentActivity(q);
  }
}
