import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const INTEREST_SERVICE_TYPES = ['lab', 'radiology', 'nursing'] as const;
export type InterestServiceType = (typeof INTEREST_SERVICE_TYPES)[number];

export class InterestDto {
  @IsIn(INTEREST_SERVICE_TYPES as unknown as string[]) service_type!: InterestServiceType;
  @IsString() @MinLength(1) @MaxLength(128) service_id!: string;
}
