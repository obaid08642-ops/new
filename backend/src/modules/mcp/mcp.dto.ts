import { IsOptional } from 'class-validator';

export class HandleRpcDto {
  @IsOptional()
  jsonrpc?: any;

  @IsOptional()
  id?: any;

  @IsOptional()
  method?: any;

  @IsOptional()
  params?: any;

}
