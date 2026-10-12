import { McpController } from './mcp.controller';

const mockService = {
  handleRpcRequestWithProtocol: jest.fn(async (body: any, header?: string) => ({
    version: header ?? '2024-11-05',
    response: { jsonrpc: '2.0', id: body?.id ?? null, result: {} },
  })),
  handleAgentToolCall: jest.fn(async (body: any) => ({ jsonrpc: '2.0', id: body?.id ?? null, result: {} })),
} as any;
const mockOAuth = { verifyAccessToken: jest.fn(async () => null) } as any;

const res = () => {
  const headers: Record<string, string> = {};
  const r: any = {
    setHeader: jest.fn((k: string, v: string) => { headers[k] = v; }),
    status: jest.fn(() => r),
    headers,
  };
  return r;
};

describe('McpController Streamable HTTP headers (AC-2)', () => {
  const controller = new McpController(mockService, mockOAuth);

  it('echoes MCP-Protocol-Version 2025-06-18 on initialize', async () => {
    const r = res();
    const out: any = await controller.handleRpc(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      { headers: { 'mcp-protocol-version': '2025-06-18' } } as any,
      r,
    );
    expect(r.setHeader).toHaveBeenCalledWith('MCP-Protocol-Version', '2025-06-18');
    expect(out.jsonrpc).toBe('2.0');
  });

  it('answers HTTP 400 for an unknown MCP-Protocol-Version before any tool runs', async () => {
    mockService.handleRpcRequestWithProtocol.mockImplementationOnce(async (body: any, header: string) => ({
      version: header,
      response: { jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32600, message: 'unsupported_protocol_version', data: { error_code: 'UNSUPPORTED_PROTOCOL_VERSION', supported: ['2025-06-18', '2024-11-05'] } } },
    }));
    const r = res();
    const out: any = await controller.handleRpc(
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_medicines', arguments: { query: 'x' } } },
      { headers: { 'mcp-protocol-version': '1999-01-01' } } as any,
      r,
    );
    expect(r.status).toHaveBeenCalledWith(400);
    expect(out.error.data.error_code).toBe('UNSUPPORTED_PROTOCOL_VERSION');
    expect(r.setHeader).toHaveBeenCalledWith('MCP-Protocol-Version', '1999-01-01');
  });

  it('keeps the legacy shape header-free requests working (WebMCP/llms.txt)', async () => {
    const r = res();
    await controller.handleRpc(
      { jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} },
      { headers: {} } as any,
      r,
    );
    expect(r.setHeader).toHaveBeenCalledWith('MCP-Protocol-Version', '2024-11-05');
    expect(r.status).not.toHaveBeenCalled();
  });

  it('still answers 401 with resource_metadata for an agent tool without a token', async () => {
    const r = res();
    await expect(controller.handleRpc(
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'my_orders', arguments: {} } },
      { headers: {} } as any,
      r,
    )).rejects.toMatchObject({ status: 401 });
    const www: string = r.headers['WWW-Authenticate'] || '';
    expect(www).toMatch(/resource_metadata="/);
    expect(r.headers['MCP-Protocol-Version']).toBe('2024-11-05');
  });

  it('answers GET /mcp with 405 and Allow: POST', async () => {
    const r = res();
    await expect(controller.handleGet(r)).rejects.toMatchObject({ status: 405 });
    expect(r.headers.Allow).toBe('POST');
  });
});
