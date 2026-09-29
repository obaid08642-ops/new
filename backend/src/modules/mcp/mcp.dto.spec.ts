import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HandleRpcDto } from './mcp.dto';

// MCP clients (ChatGPT, Claude, …) send JSON-RPC ids as numbers; an id: string rule rejected every call.
describe('HandleRpcDto', () => {
  const check = (body: any) => validate(plainToInstance(HandleRpcDto, body), { whitelist: true, forbidNonWhitelisted: true });

  it('accepts numeric, string and null JSON-RPC ids', async () => {
    for (const id of [1, 'abc', null]) {
      expect(await check({ jsonrpc: '2.0', id, method: 'tools/list' })).toHaveLength(0);
    }
  });

  it('still rejects unknown top-level fields', async () => {
    expect((await check({ jsonrpc: '2.0', id: 1, method: 'tools/list', evil: true })).length).toBeGreaterThan(0);
  });
});
