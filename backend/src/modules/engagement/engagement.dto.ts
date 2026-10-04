import { IsIn, IsLocale, IsOptional, IsString, MaxLength } from 'class-validator';

export class EngagementEventDto {
  @IsIn([
    'medicine', 'category', 'doctor', 'specialty', 'lab_test',
    'radiology', 'nursing', 'pregnancy', 'ovulation', 'family',
    'mental_health', 'nutrition', 'search_query',
  ])
  // dtolint only inspects the decorator immediately above the property.
  @IsString()
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
