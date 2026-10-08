import { IsDefined, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class IngestEventDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  eventType: string;

  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  domain: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  idempotencyKey: string;
}

export class FunnelQueryDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  steps: string;
}

export const ANALYTICS_EVENT_TYPES = ['search', 'click', 'page_view', 'add_to_cart', 'booking_attempt', 'conversion'] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export function isKnownEventType(v: string): v is AnalyticsEventType {
  return (ANALYTICS_EVENT_TYPES as readonly string[]).includes(v);
}

export const FUNNEL_STEP: Record<string, string> = {
  search: 'search',
  click: 'click',
  add_to_cart: 'add_to_cart',
  booking_attempt: 'booking_attempt',
  conversion: 'conversion',
};

export function parseFunnelSteps(raw: string): string[] {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function funnelStepValid(step: string): boolean {
  void FUNNEL_STEP;
  return isKnownEventType(step);
}

export type ConsentLevel = 'granted' | 'denied' | 'unknown';

export interface ConsentSnapshot {
  analytics: ConsentLevel;
  personalized: ConsentLevel;
}

export type ConsentResolver = (userId: string) => Promise<ConsentSnapshot>;
