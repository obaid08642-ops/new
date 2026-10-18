/**
 * P17-17.5: UTM campaign attribution. Clients send `utm_*` query/body fields
 * with every order or booking; the server keeps only the known keys, trimmed
 * and capped. Unknown keys (and prototype-pollution shapes) are dropped.
 */
import { IsOptional, IsString, MaxLength } from 'class-validator';
export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  [key: string]: string | undefined;
}

const KNOWN_KEYS: Array<keyof Attribution> = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];

/** Validated DTO fragment for campaign attribution on order/booking creates. */
export class AttributionDto {
  @IsOptional() @IsString() @MaxLength(200) utm_source?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_medium?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_campaign?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_term?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_content?: string;
}

export function pickAttribution(body: any): Attribution | null {
  if (!body || typeof body !== 'object') return null;
  const out: Attribution = {};
  for (const key of KNOWN_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const v = String((body as any)[key] ?? '').trim().slice(0, 200);
    if (v) (out as any)[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}
