import { IsObject, IsOptional, IsString } from 'class-validator';

export class HandleRpcDto {
  @IsOptional()
  @IsString()
  jsonrpc?: string;


  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  method?: string;


  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

}
