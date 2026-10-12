import { Module } from '@nestjs/common';
import { AgentOAuthService } from './agent-oauth.service';
import {
  AdminAgentClientsController, AgentOAuthController, AgentOAuthWellKnownController, PatientAgentConnectionsController,
} from './agent-oauth.controller';

/** AC-1: OAuth 2.1 for AI assistants (docs/review/AGENT_COMMERCE_SPEC_2026-10-12.md). */
@Module({
  controllers: [AgentOAuthWellKnownController, AgentOAuthController, PatientAgentConnectionsController, AdminAgentClientsController],
  providers: [AgentOAuthService],
  exports: [AgentOAuthService],
})
export class AgentOAuthModule {}
