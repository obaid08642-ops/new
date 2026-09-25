import { IsOptional, IsString } from 'class-validator';

export class HandleRpcDto {
  @IsOptional()
  @IsString()
  jsonrpc?: string;


  @IsOptional()
  id?: any;

  @IsOptional()
  @IsString()
  method?: string;


  @IsOptional()
  params?: any;

}
