import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { RUM_LOCALES, RUM_METRICS, RUM_PAGE_TYPES, RUM_RATINGS } from './rum.constants';

/** One web-vitals sample (next/web-vitals: name, value, rating, navigationType). */
export class RumSampleDto {
  @IsIn(RUM_METRICS as unknown as string[])
  name!: string;

  /** milliseconds, or the unitless CLS score */
  @IsNumber()
  @Min(0)
  @Max(600_000)
  value!: number;

  @IsIn(RUM_RATINGS as unknown as string[])
  rating!: string;

  @IsOptional()
  @IsIn(['navigate', 'reload', 'back-forward', 'back-forward-cache', 'prerender', 'restore'])
  nav?: string;
}

/** What the web sends once per page view (on pagehide): the page type, the locale, and up to 5 samples. */
export class RumReportDto {
  @IsIn(RUM_PAGE_TYPES as unknown as string[])
  page_type!: string;

  @IsIn(RUM_LOCALES as unknown as string[])
  locale!: string;

  @IsOptional()
  @IsIn(['mobile', 'desktop'])
  device?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => RumSampleDto)
  samples!: RumSampleDto[];
}

export class RumSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 7, 30])
  days?: number;
}
