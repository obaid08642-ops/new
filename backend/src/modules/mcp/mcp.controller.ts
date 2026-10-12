import { Controller, Post, Get, Body, HttpCode, UseInterceptors, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { McpService, MCP_TOOLS } from './mcp.service';
import { Public } from '../../common/auth.guard';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';
import { HandleRpcDto } from './mcp.dto';
import { AgentOAuthService } from '../agent-oauth/agent-oauth.service';
import { AGENT_TOOL_SCOPES, resourceMetadataUrl } from '../agent-oauth/agent-oauth.constants';

@Controller('mcp')
@UseInterceptors(RedisCacheInterceptor)
export class McpController {
  constructor(private readonly mcpService: McpService, private readonly agentOAuth: AgentOAuthService) {}

  /**
   * Public tools stay anonymous. An authenticated agent tool (AC-1/AC-3) needs an agent
   * access token for this resource: without one, HTTP 401 with the RFC 9728 pointer
   * (`WWW-Authenticate: Bearer resource_metadata=...`), which starts the MCP sign-in flow.
   */
  @Public()
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async handleRpc(@Body() body: HandleRpcDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const toolName = body?.method === 'tools/call' ? (body.params as { name?: unknown } | undefined)?.name : undefined;
    const scope = typeof toolName === 'string' ? AGENT_TOOL_SCOPES[toolName] : undefined;
    if (scope) {
      const header = String(req.headers.authorization || '');
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      const principal = await this.agentOAuth.verifyAccessToken(token);
      const meta = resourceMetadataUrl();
      if (!principal) {
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${meta}"${token ? ', error="invalid_token"' : ''}, scope="${scope}"`);
        throw new HttpException({ jsonrpc: '2.0', id: body.id ?? null, error: { code: -32001, message: 'authentication_required', data: { error_code: 'AUTHENTICATION_REQUIRED', resource_metadata: meta } } }, HttpStatus.UNAUTHORIZED);
      }
      if (!principal.scopes.includes(scope)) {
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${meta}", error="insufficient_scope", scope="${scope}"`);
        throw new HttpException({ jsonrpc: '2.0', id: body.id ?? null, error: { code: -32003, message: 'insufficient_scope', data: { error_code: 'INSUFFICIENT_SCOPE', scope } } }, HttpStatus.FORBIDDEN);
      }
      return this.mcpService.handleAgentToolCall(body, principal);
    }
    return this.mcpService.handleRpcRequest(body);
  }

  @Public()
  @Get('tools')
  async getTools() {
    return {
      tools: MCP_TOOLS,
    };
  }

  @Public()
  @Get('server-card')
  async getServerCard() {
    const publicUrl = process.env.MCP_PUBLIC_URL || 'https://mcp.nabd.plus';
    return {
      schema: 'https://modelcontextprotocol.io/server-card/v0',
      name: 'Nabd Plus Healthcare MCP Server',
      description: 'Unified Model Context Protocol (MCP) server for Saudi healthcare discovery, consultation booking, and pharmacy services.',
      version: '1.0.0',
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
      endpoints: {
        mcp_rpc: `${publicUrl}/api/v1/mcp`,
        tools: `${publicUrl}/api/v1/mcp/tools`,
        server_card: `${publicUrl}/api/v1/mcp/server-card`,
      },
      status: 'active',
      governance: {
        prescription_enforcement: 'strict_sfda_compliant',
        booking_confirmation: 'user_approval_required',
      },
    };
  }
}
