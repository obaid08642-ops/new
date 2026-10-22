import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateBy, ValidateNested } from 'class-validator';

// Shape checks only; the rules (candidates, radius, order validity) are answered by OrderingService with stable codes.
const ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** Every element is a plain id string (one decorator for the list, so the array rules stay readable). */
const IsIdList = () => ValidateBy({
  name: 'isIdList',
  validator: { validate: (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string' && ID.test(x)), defaultMessage: () => 'each id must be a plain id string' },
});

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
  @IsIdList()
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

// ---------- M4: ASAP and photo-order broadcast ----------

export class AsapDto {
  @IsIn(['lab', 'radiology', 'nursing'])
  service_kind: 'lab' | 'radiology' | 'nursing';

  // an empty list is answered by the service with `asap_items_required`
  @IsArray()
  @ArrayMaxSize(30)
  @IsIdList()
  items: string[];

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsIn(['cash', 'insurance'])
  payer: 'cash' | 'insurance';
}

export class PhotoOrderDto {
  @IsIn(['lab', 'radiology', 'nursing'])
  service_kind: 'lab' | 'radiology' | 'nursing';

  // a missing upload is answered by the service with `photo_upload_required`
  @IsOptional()
  @IsString()
  @Matches(ID)
  upload_id?: string;

  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsIn(['cash', 'insurance'])
  payer: 'cash' | 'insurance';
}

export class OfferItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000)
  price: number;
}

export class BroadcastOfferDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OfferItemDto)
  items: OfferItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
