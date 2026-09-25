import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateDto {
  @IsOptional()
  @IsString()
  facility_id: string;

  @IsOptional()
  @IsString()
  staff_id: string;

  @IsOptional()
  date?: any;

  @IsOptional()
  staff_name?: any;

  @IsOptional()
  role?: any;

  @IsOptional()
  start?: any;

  @IsOptional()
  end?: any;

}

export class CreateRuleDto {
  @IsOptional()
  name_ar?: any;

  @IsOptional()
  min_order_sar?: any;

  @IsOptional()
  service_type?: any;

  @IsOptional()
  city?: any;

  @IsOptional()
  user_segment?: any;

  @IsOptional()
  free?: any;

  @IsOptional()
  fee_sar?: any;

  @IsOptional()
  active?: any;

}

export class CreateAutoRuleDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  trigger: string;

  @IsOptional()
  template?: any;

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
  commission?: any;
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
