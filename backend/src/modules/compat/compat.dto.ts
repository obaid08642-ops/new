import { IsArray, IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class SendDto {
  @IsOptional()
  @IsString()
  text: string;

}

export class AddDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  dosage: string;

  @IsOptional()
  form?: any;

  @IsDefined()
  @IsArray()
  times: any[];

  @IsOptional()
  source?: any;

}

export class RegisterDto {
  @IsOptional()
  @IsString()
  kind: string;

  @IsDefined()
  @IsString()
  name: string;

}

export class IngestDto {
  @IsOptional()
  @IsArray()
  samples: any[];

}

export class CreateDto {
  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  prescription_id?: any;

  @IsOptional()
  manual_request?: any;

  @IsOptional()
  delivery_address_id?: any;

  @IsOptional()
  payment_method?: any;

  @IsOptional()
  insurance_policy_id?: any;

}

export class BookDto {
  @IsOptional()
  service_id?: any;

  @IsOptional()
  package_id?: any;

  @IsOptional()
  scheduled_at?: any;

  @IsOptional()
  address_id?: any;

  @IsOptional()
  notes?: any;

  @IsOptional()
  payment_method?: any;

  @IsOptional()
  insurance_policy_id?: any;

}

export class BareSendDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
export class SendDto2 {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
export class BatchDto {
  @IsOptional()
  @IsArray()
  events?: any[];
}
export class CheckDto {
  @IsOptional()
  @IsArray()
  drugs?: string[];

  @IsOptional()
  @IsString()
  drug?: string;
}
export class SendMessageDto {
  @IsOptional()
  @IsString()
  body?: string;
}
export class AddNoteToActiveDto {
  @IsOptional()
  vitals?: any;

  @IsOptional()
  @IsString()
  note?: string;
}
export class AddNoteDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
export class VerifyGpsDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
export class ReportShortageDto {
  @IsOptional()
  @IsString()
  product_name?: string;

  @IsOptional()
  @IsString()
  medicine_id?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
export class VoiceToOrderDto {
  @IsOptional()
  @IsString()
  text?: string;
}
