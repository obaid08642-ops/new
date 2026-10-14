import { McpService, MCP_LATEST_PROTOCOL_VERSION, MCP_LEGACY_PROTOCOL_VERSION, negotiateProtocolVersion, buildMcpServerCard } from './mcp.service';

describe('McpService Streamable HTTP transport (AC-2)', () => {
  const service = new McpService({} as any, {} as any, {} as any, { collection: jest.fn() } as any);

  it('negotiates MCP 2025-06-18 when the client asks for it', async () => {
    const res: any = await service.handleRpcRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } },
    });
    expect(res.result.protocolVersion).toBe('2025-06-18');
  });

  it('keeps the legacy JSON-RPC shape working when no version is sent (WebMCP/llms.txt)', async () => {
    const res: any = await service.handleRpcRequest({ jsonrpc: '2.0', id: 2, method: 'initialize' });
    expect(res.result.protocolVersion).toBe(MCP_LEGACY_PROTOCOL_VERSION);
    expect(res.result.serverInfo.name).toBe('nabdah-mcp-server');
  });

  it('negotiateProtocolVersion echoes a supported version and offers latest for unknown ones', () => {
    expect(negotiateProtocolVersion('2025-06-18')).toBe('2025-06-18');
    expect(negotiateProtocolVersion('2024-11-05')).toBe('2024-11-05');
    expect(negotiateProtocolVersion('1999-01-01')).toBe(MCP_LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocolVersion(undefined)).toBe(MCP_LEGACY_PROTOCOL_VERSION);
  });

  it('refuses an unsupported MCP-Protocol-Version header without touching any tool', async () => {
    const out = await service.handleRpcRequestWithProtocol(
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search_medicines', arguments: { query: 'x' } } },
      '1999-01-01',
    );
    expect(out.response.error.data.error_code).toBe('UNSUPPORTED_PROTOCOL_VERSION');
  });

  it('the server card lists the OAuth requirement and the agent scopes', () => {
    const card: any = buildMcpServerCard();
    expect(card.protocol.transport).toBe('streamable-http');
    expect(card.protocol.versions_supported).toContain('2025-06-18');
    expect(card.authorization.type).toBe('oauth2');
    expect(String(card.authorization.authorization_server_metadata)).toContain('/.well-known/oauth-authorization-server');
    for (const scope of ['agent:read', 'agent:order', 'agent:book']) {
      expect(Object.keys(card.authorization.scopes)).toContain(scope);
    }
    expect(card.authorization.authenticated_tools.my_orders).toBe('agent:read');
    expect(card.authorization.public_tools_anonymous).toBe(true);
  });
});
