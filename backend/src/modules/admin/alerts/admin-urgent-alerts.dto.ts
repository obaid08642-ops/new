import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';

export const ADMIN_ALERT_KINDS = ['sla_breach', 'order_stuck', 'payment_failures', 'fraud_high'] as const;
export type AdminAlertKind = typeof ADMIN_ALERT_KINDS[number];

/** One admin-edited urgent-alert rule (admin/src/pages/admin/alerts.tsx, rules section). */
export class AdminAlertRuleDto {
  @IsIn(ADMIN_ALERT_KINDS as unknown as string[])
  kind: AdminAlertKind;

  /** Per kind: minutes past the SLA due time, minutes an order sits open, failed payments in one hour, or the
   * minimum fraud confidence in percent. The range per kind is checked by the service. */
  @IsInt()
  @Min(0)
  @Max(100000)
  threshold: number;

  @IsBoolean()
  enabled: boolean;

  @IsBoolean()
  notify_email: boolean;
}

export class UpdateAdminAlertRulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ADMIN_ALERT_KINDS.length)
  @ValidateNested({ each: true })
  @Type(() => AdminAlertRuleDto)
  rules: AdminAlertRuleDto[];
}

/** GET /admin/urgent-alerts query (page/limit as the other admin lists send them). */
export class ListAdminAlertsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,5}$/)
  page?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3}$/)
  limit?: string;

  @IsOptional()
  @IsIn(['all', 'unread'])
  filter?: 'all' | 'unread';
}
