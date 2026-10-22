import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

// Shape checks only. Catalogue lookups, validity, the prescription link and ownership are answered by
// MedicalOrdersService with the stable codes the clients show (medical_order_empty, valid_days_invalid…).

export class MedicalOrderDto {
  // each entry: { catalog_id } (labs, radiology) or { catalog_id, sessions?, interval_days? } (nursing)
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  labs?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  radiology?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  nursing?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  prescription_id?: string;

  // 30 | 90 | 180 (checked in the service)
  @IsOptional()
  @IsNumber()
  valid_days?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MedicalOrderItemActionDto {
  // every still-open item of the same group, not only this one
  @IsOptional()
  @IsBoolean()
  group_all?: boolean;
}

export class LinkBookingDto {
  @IsString()
  booking_id: string;

  @IsIn(['lab', 'radiology', 'nursing'])
  booking_kind: 'lab' | 'radiology' | 'nursing';
}
