import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Hosts an admin may point a week image at: the same CDN hosts patient-web lets next/image load (lib/image-hosts.ts). */
export const PREGNANCY_WEEK_IMAGE_HOSTS = ['cdn.nabd.plus', 'res.cloudinary.com'];

/** PUT /admin/maternity/weeks/:week — the admin fills or edits one week of the catalogue (admin/src/pages/admin/pregnancy-weeks.tsx). */
export class UpsertPregnancyWeekDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  size_ar!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  size_en?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  development_ar!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  development_en?: string;

  // An https URL on the CDN; the image is never bundled in the apps (owner decision D).
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true, host_whitelist: PREGNANCY_WEEK_IMAGE_HOSTS })
  @MaxLength(800)
  image_url?: string;

  @IsBoolean()
  published!: boolean;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

/** DELETE /admin/maternity/weeks/:week — removes a week entry (it then answers null again). */
export class RemovePregnancyWeekDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}

/** GET /maternity/content?week= — a week other than the reader's current one (1-42); without it the profile's week is used. */
export class MaternityContentQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(42)
  week?: number;
}
