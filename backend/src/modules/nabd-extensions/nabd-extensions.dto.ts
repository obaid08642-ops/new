import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BroadcastOfferItemDto {
  @IsDefined()
  @IsString()
  order_item_id: string;

  @IsDefined()
  @IsIn(['available', 'unavailable', 'substitute'])
  availability: 'available' | 'unavailable' | 'substitute';

  @IsOptional()
  @IsNumber()
  qty_offered?: number;

  @IsOptional()
  @IsNumber()
  unit_price_override?: number;
}

export class CreditWalletDto {
  @IsDefined()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsIn(['booking', 'refund', 'referral'])
  referenceType?: 'booking' | 'refund' | 'referral';


  @IsOptional()
  @IsString()
  referenceId?: string;


  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsString()
  ownerId?: string;


  @IsOptional()
  @IsString()
  ownerType?: string;


  @IsOptional()
  @IsIn(["credit", "debit"])
  type: string;

}

export class DebitWalletDto {
  @IsDefined()
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsIn(['booking', 'refund', 'referral'])
  referenceType?: 'booking' | 'refund' | 'referral';


  @IsOptional()
  @IsString()
  referenceId?: string;


  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsString()
  ownerId?: string;


  @IsOptional()
  @IsString()
  ownerType?: string;


  @IsOptional()
  @IsIn(["credit", "debit"])
  type: string;

}

export class RespondToBroadcastDto {
  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  broadcast_order_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BroadcastOfferItemDto)
  items?: BroadcastOfferItemDto[];

  @IsOptional()
  @IsString()
  provider_note?: string;

  @IsOptional()
  @IsNumber()
  eta_minutes?: number;
}

export class ClaimReferralDto {
  @IsDefined()
  @IsString()
  code: string;
}
export class UpdateFlagDto {
  @IsDefined()
  @IsString()
  flagName: string;

  @IsDefined()
  @IsBoolean()
  isEnabled: boolean;
}
export class EnrollProgramDto {
  @IsDefined()
  @IsIn(["diabetes", "hypertension", "pregnancy"])
  programType: "diabetes" | "hypertension" | "pregnancy";
}
export class CompleteSessionDto {
  @IsDefined()
  @IsString()
  programType: string;

  @IsDefined()
  @IsString()
  sessionId: string;
}
export class MatchPharmacyDto {
  @IsDefined()
  @IsNumber()
  lat: number;

  @IsDefined()
  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  requiredMedName?: string;
}
export class MatchNurseDto {
  @IsDefined()
  @IsNumber()
  lat: number;

  @IsDefined()
  @IsNumber()
  lng: number;
}
export class VerifyNurseAttendanceDto {
  @IsDefined()
  @IsString()
  visitId: string;

  @IsDefined()
  @IsNumber()
  lat: number;

  @IsDefined()
  @IsNumber()
  lng: number;
}
export class VerifyBarcodeDto {
  @IsDefined()
  @IsString()
  sampleId: string;

  @IsDefined()
  @IsString()
  barcodeId: string;
}
export class VerifyLabResultsDto {
  @IsDefined()
  @IsString()
  sampleId: string;

  @IsDefined()
  @IsNumber()
  actualValue: number;
}
export class EnrollCorporateDto {
  @IsDefined()
  @IsString()
  companyName: string;

  @IsDefined()
  @IsString()
  employeeId: string;

  @IsDefined()
  @IsNumber()
  requestedAmount: number;
}

export class CreateAdBidDto {
  @IsDefined() @IsString() ad_id: string;
  @IsDefined() @IsNumber() bid_amount: number;
  @IsOptional() @IsString() campaign_id?: string;
  @IsOptional() @IsString() placement?: string;
  @IsOptional() @IsString() reason?: string;
}
