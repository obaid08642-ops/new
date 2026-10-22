import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsLatitude, IsLongitude, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

// Shape checks only; the rules (candidates, radius, order validity) are answered by OrderingService with stable codes.
const ID = /^[A-Za-z0-9_.:-]{1,128}$/;

export class QuoteContextDto {
  @IsIn(['home', 'facility'])
  mode: 'home' | 'facility';

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsIn(['cash', 'insurance'])
  payer: 'cash' | 'insurance';

  @IsOptional()
  @IsString()
  @Matches(ID)
  family_member_id?: string;
}

export class QuoteDto {
  @IsIn(['lab', 'radiology', 'nursing'])
  service_kind: 'lab' | 'radiology' | 'nursing';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Matches(ID, { each: true })
  items: string[];

  @ValidateNested()
  @Type(() => QuoteContextDto)
  context: QuoteContextDto;

  @IsOptional()
  @IsIn(['cheapest', 'nearest', 'fastest', 'rating'])
  sort?: 'cheapest' | 'nearest' | 'fastest' | 'rating';
}

export class WindowsQueryDto {
  @IsString()
  @Matches(ID)
  provider_id: string;

  @IsIn(['home', 'facility'])
  mode: 'home' | 'facility';

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

export class SelectionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(ID)
  provider_id: string;

  // free-form: { asap: true } or { start, end } of an offered 2-hour window; the service checks it against the offered windows
  @IsOptional()
  @IsObject()
  window?: { asap?: boolean; start?: string; end?: string };

  @IsOptional()
  @IsString()
  @Matches(ID)
  slot_id?: string;

  @IsOptional()
  @IsBoolean()
  walk_in?: boolean;
}

export class SelectionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SelectionDto)
  home?: SelectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectionDto)
  facility?: SelectionDto;
}

export class BookingDocumentDto {
  @IsIn(['doctor_request', 'preauth'])
  kind: 'doctor_request' | 'preauth';

  @IsString()
  @MaxLength(2_000_000)
  url_or_b64: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;
}

export class CreateOrderingBookingDto {
  @IsString()
  @Matches(ID)
  quote_id: string;

  @ValidateNested()
  @Type(() => SelectionsDto)
  selections: SelectionsDto;

  @IsIn(['cash', 'card', 'insurance'])
  payment_method: 'cash' | 'card' | 'insurance';

  @IsOptional()
  @IsIn(['female', 'male'])
  gender_preference?: 'female' | 'male';

  @IsOptional()
  @IsString()
  @Matches(ID)
  medical_order_id?: string;

  // an uploaded doctor's request or pre-authorisation instead of a medical order
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => BookingDocumentDto)
  documents?: BookingDocumentDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
