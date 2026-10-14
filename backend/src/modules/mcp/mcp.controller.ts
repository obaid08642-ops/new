import { Controller, Post, Get, Body, HttpCode, UseInterceptors, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { McpService, MCP_TOOLS, MCP_LEGACY_PROTOCOL_VERSION, buildMcpServerCard } from './mcp.service';
import { AgentToolsService } from './agent-tools.service';
import { Public } from '../../common/auth.guard';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';
import { HandleRpcDto } from './mcp.dto';
import { AgentOAuthService } from '../agent-oauth/agent-oauth.service';
import { AGENT_TOOL_SCOPES, resourceMetadataUrl } from '../agent-oauth/agent-oauth.constants';

@Controller('mcp')
@UseInterceptors(RedisCacheInterceptor)
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly agentOAuth: AgentOAuthService,
    private readonly agentTools: AgentToolsService,
  ) {}

  /**
   * AC-2: MCP 2025-06-18 Streamable HTTP transport (JSON responses, no SSE stream).
   * The pre-AC-2 JSON-RPC body shape keeps working untouched (WebMCP, llms.txt).
   * Every response carries the `MCP-Protocol-Version` header naming the version the
   * body speaks; an unknown version in the request header is refused with HTTP 400
   * before any tool runs.
   *
   * Public tools stay anonymous. An authenticated agent tool (AC-1/AC-3) needs an agent
   * access token for this resource: without one, HTTP 401 with the RFC 9728 pointer
   * (`WWW-Authenticate: Bearer resource_metadata=...`), which starts the MCP sign-in flow.
   */
  @Public()
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async handleRpc(@Body() body: HandleRpcDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const headerVersion = typeof req.headers['mcp-protocol-version'] === 'string'
      ? String(req.headers['mcp-protocol-version'])
      : undefined;
    const toolName = body?.method === 'tools/call' ? (body.params as { name?: unknown } | undefined)?.name : undefined;
    const scope = typeof toolName === 'string' ? AGENT_TOOL_SCOPES[toolName] : undefined;
    if (scope) {
      const header = String(req.headers.authorization || '');
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      const principal = await this.agentOAuth.verifyAccessToken(token);
      const meta = resourceMetadataUrl();
      res.setHeader('MCP-Protocol-Version', headerVersion ?? MCP_LEGACY_PROTOCOL_VERSION);
      if (!principal) {
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${meta}"${token ? ', error="invalid_token"' : ''}, scope="${scope}"`);
        throw new HttpException({ jsonrpc: '2.0', id: body.id ?? null, error: { code: -32001, message: 'authentication_required', data: { error_code: 'AUTHENTICATION_REQUIRED', resource_metadata: meta } } }, HttpStatus.UNAUTHORIZED);
      }
      if (!principal.scopes.includes(scope)) {
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${meta}", error="insufficient_scope", scope="${scope}"`);
        throw new HttpException({ jsonrpc: '2.0', id: body.id ?? null, error: { code: -32003, message: 'insufficient_scope', data: { error_code: 'INSUFFICIENT_SCOPE', scope } } }, HttpStatus.FORBIDDEN);
      }
      // AC-3: through the existing services (no copies of booking or order logic).
      // (scope is only set when toolName is a string key of AGENT_TOOL_SCOPES.)
      return this.agentTools.dispatch(
        toolName as string, ((body.params as { arguments?: unknown } | undefined)?.arguments ?? {}) as Record<string, unknown>,
        principal, body.id ?? null,
      );
    }
    // AC-3: consultation_slots is public (real slots only, no patient data).
    if (toolName === 'consultation_slots') {
      const out = await this.agentTools.dispatchPublic(
        toolName, ((body.params as { arguments?: unknown } | undefined)?.arguments ?? {}) as Record<string, unknown>,
        body.id ?? null,
      );
      res.setHeader('MCP-Protocol-Version', headerVersion ?? MCP_LEGACY_PROTOCOL_VERSION);
      return out;
    }
    const { version, response } = await this.mcpService.handleRpcRequestWithProtocol(body, headerVersion);
    res.setHeader('MCP-Protocol-Version', version);
    if (response?.error?.data?.error_code === 'UNSUPPORTED_PROTOCOL_VERSION') {
      res.status(HttpStatus.BAD_REQUEST);
    }
    return response;
  }

  /**
   * AC-2: this endpoint speaks Streamable HTTP POST only (JSON responses, no SSE
   * stream), so a GET names the allowed method instead of falling through to 404.
   */
  @Public()
  @Get()
  @HttpCode(405)
  async handleGet(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Allow', 'POST');
    res.setHeader('MCP-Protocol-Version', MCP_LEGACY_PROTOCOL_VERSION);
    throw new HttpException(
      { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'method_not_allowed', data: { error_code: 'METHOD_NOT_ALLOWED', allow: ['POST'] } } },
      HttpStatus.METHOD_NOT_ALLOWED,
    );
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
    // AC-2: one builder serves the card here and in patient-web, so the transport,
    // OAuth requirement and scopes are always described identically.
    return buildMcpServerCard();
  }
}
