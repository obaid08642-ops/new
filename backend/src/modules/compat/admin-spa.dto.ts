import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  facility_id: string;

  @IsOptional()
  @IsString()
  staff_id: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  staff_name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;

}

export class CreateRuleDto {
  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsNumber()
  min_order_sar?: number;

  @IsOptional()
  @IsString()
  service_type?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(['all', 'new', 'returning', 'vip'])
  user_segment?: string;

  @IsOptional()
  @IsBoolean()
  free?: boolean;

  @IsOptional()
  @IsNumber()
  fee_sar?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

}

export class CreateAutoRuleDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  trigger: string;

  @IsOptional()
  @IsObject()
  template?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  channels?: unknown[];


  @IsOptional()
  @IsBoolean()
  active?: boolean;


}

export class ExpandDto {
  @IsOptional()
  @IsArray()
  segments?: string[];
}
export class DispatchDto {
  @IsOptional()
  @IsString()
  ambulance_id?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
export class ReassignDto {
  @IsOptional()
  @IsString()
  provider_id?: string;
}
export class UpdateDto {
  @IsOptional()
  @IsNumber()
  commission?: number;
}
export class CreateDto2 {
  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
export class ManualAdjustDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsNumber()
  points?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
export class RedeemDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsNumber()
  points?: number;

  @IsOptional()
  @IsString()
  order_id?: string;
}
export class ToggleSystemDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
export class SendDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
export class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CouponUpdateDto {
  @IsOptional() @IsNumber() discount_percent?: number;
  @IsOptional() @IsNumber() discount_amount?: number;
  @IsOptional() @IsNumber() max_uses?: number;
  @IsOptional() @IsDateString() valid_from?: string;
  @IsOptional() @IsDateString() valid_until?: string;
  @IsOptional() @IsNumber() min_order?: number;
  @IsOptional() @IsNumber() max_discount?: number;
  @IsOptional() @IsNumber() usage_limit_per_user?: number;
  @IsOptional() @IsString() provider_id?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) categories?: string[];
  @IsOptional() @IsBoolean() first_order_only?: boolean;
  @IsOptional() @IsString() campaign_id?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class LoyaltyEarnRuleUpdateDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsString() name_en?: string;
  @IsOptional() @IsString() event?: string;
  @IsOptional() @IsNumber() points?: number;
  @IsOptional() @IsNumber() multiplier?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsObject() conditions?: Record<string, unknown>;
}

export class AutoRuleUpdateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() trigger?: string;
  // The rule's message template supports arbitrary localized fields.
  @IsOptional() @IsObject() template?: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) channels?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class DeliveryRuleUpdateDto {
  @IsOptional() @IsString() name_ar?: string;
  @IsOptional() @IsNumber() min_order_sar?: number;
  @IsOptional() @IsString() service_type?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsIn(['all', 'new', 'returning', 'vip']) user_segment?: string;
  @IsOptional() @IsBoolean() free?: boolean;
  @IsOptional() @IsNumber() fee_sar?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class PromotionUpdateDto {
  @IsOptional() @IsString() title_ar?: string;
  @IsOptional() @IsString() title_en?: string;
  @IsOptional() @IsNumber() original_price?: number;
  @IsOptional() @IsNumber() discounted_price?: number;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
  @IsOptional() @IsString() image_url?: string;
  @IsOptional() @IsObject() target_parameters?: Record<string, unknown>;
  @IsOptional() @IsIn(['draft', 'pending', 'approved', 'paused', 'rejected', 'expired']) status?: string;
}

export class ClaimApprovalDto {
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsNumber() copay_percent?: number;
}

// Config values are intentionally free-form JSON owned by the admin UI.
export class AdminConfigDto {
  @IsObject()
  value: Record<string, unknown>;
}

export class CouponConfigDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) audience?: string[];
}

export class PermissionEntryDto {
  @IsString() role: string;
  @IsArray() @IsString({ each: true }) permissions: string[];
}

export class WorkflowEntryDto {
  @IsString() key: string;
  @IsArray() @IsString({ each: true }) steps: string[];
}

export class AlertRuleDto {
  @IsString() name: string;
  @IsOptional() @IsString() metric?: string;
  @IsOptional() @IsNumber() threshold?: number;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) channels?: string[];
}

export class ThemeConfigDto {
  @IsOptional() @IsString() primary?: string;
  @IsOptional() @IsString() accent?: string;
  @IsOptional() @IsString() danger?: string;
  @IsOptional() @IsString() background?: string;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsNumber() radius?: number;
  @IsOptional() @IsString() font?: string;
}

export class AiConfigDto {
  @IsOptional() @IsString() triage_model?: string;
  @IsOptional() @IsNumber() symptom_confidence_threshold?: number;
  @IsOptional() @IsBoolean() red_flag_escalation?: boolean;
  @IsOptional() @IsNumber() max_suggestions?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
}
export class ShortageDto {
  @IsOptional()
  @IsString()
  reporter?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
export class CustomReportDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
export class AssignDto {
  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  nurse_id?: string;

  @IsOptional()
  @IsString()
  nurseId?: string;
}
