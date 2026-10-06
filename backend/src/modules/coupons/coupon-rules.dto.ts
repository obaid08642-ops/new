import { IsArray, IsDefined, IsNumber, IsOptional, IsString, ArrayMaxSize, ArrayMinSize, Min } from 'class-validator';

export class EvaluateStackDto {
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  codes: string[];

  @IsDefined()
  @IsNumber()
  @Min(0)
  order_total: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  provider_id?: string;
}

export class ApplyStackDto extends EvaluateStackDto {
  @IsDefined()
  @IsString()
  order_id: string;
}
