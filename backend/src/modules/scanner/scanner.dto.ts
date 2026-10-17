import { IsDefined, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/** About 7.5 MB of image once decoded: the camera photo is downscaled by the clients before it is sent. */
export const SCAN_MAX_BASE64_CHARS = 10_000_000;
export const SCAN_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const SCAN_KINDS = ['pack', 'barcode', 'qr', 'prescription'] as const;
export type ScanKind = (typeof SCAN_KINDS)[number];

/** POST /ai/scan: one photo, as base64 or a data URL of an image type the vision model reads. */
export class ScanImageDto {
  @IsDefined()
  @IsString()
  @MaxLength(SCAN_MAX_BASE64_CHARS)
  @Matches(/^(data:image\/(jpeg|png|webp);base64,)?[A-Za-z0-9+/=\s]+$/, { message: 'image_base64_invalid' })
  image_base64: string;

  @IsOptional()
  @IsIn(SCAN_IMAGE_TYPES as unknown as string[])
  mime_type?: string;
}

/** The strict JSON the vision model must answer with; anything else is refused as an unreadable photo. */
export class ScanReadingDto {
  @IsIn(SCAN_KINDS as unknown as string[])
  kind: ScanKind;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  strength?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  form?: string | null;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;
}
