import { Allow, IsObject, IsOptional, IsString } from 'class-validator';

export class HandleRpcDto {
  @IsOptional()
  @IsString()
  jsonrpc?: string;


  // JSON-RPC 2.0: id is a string, a number or null. MCP clients (ChatGPT, Claude, …) send numbers.
  @IsOptional()
  @Allow()
  id?: string | number | null;

  @IsOptional()
  @IsString()
  method?: string;


  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

}
