import { IsIn, IsLocale, IsOptional, IsString, MaxLength } from 'class-validator';

export class EngagementEventDto {
  @IsIn([
    'medicine', 'category', 'doctor', 'specialty', 'lab_test',
    'radiology', 'nursing', 'pregnancy', 'ovulation', 'family',
    'mental_health', 'nutrition', 'search_query',
  ])
  kind: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  ref_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  query?: string;

  @IsString()
  @MaxLength(10)
  locale: string;
}
