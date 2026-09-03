import { Controller, Post, Get, Body, HttpCode } from '@nestjs/common';
import { McpService, MCP_TOOLS } from './mcp.service';
import { Public } from '../../common/auth.guard';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Public()
  @Post()
  @HttpCode(200)
  async handleRpc(@Body() body: any) {
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
