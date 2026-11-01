import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ShareLinkDto {
  /** How long the link works: 1 to 30 days, 7 when omitted. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expires_in_days?: number;
}
