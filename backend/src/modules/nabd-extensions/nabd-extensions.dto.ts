import { IsArray, IsBoolean, IsDefined, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreditWalletDto {
  @IsDefined()
  @IsNumber()
  amount: number;

  @IsOptional()
  referenceType?: any;

  @IsOptional()
  referenceId?: any;

  @IsOptional()
  description?: any;

  @IsOptional()
  ownerId?: any;

  @IsOptional()
  ownerType?: any;

  @IsOptional()
  @IsIn(["credit", "debit"])
  type: string;

}

export class DebitWalletDto {
  @IsDefined()
  @IsNumber()
  amount: number;

  @IsOptional()
  referenceType?: any;

  @IsOptional()
  referenceId?: any;

  @IsOptional()
  description?: any;

  @IsOptional()
  ownerId?: any;

  @IsOptional()
  ownerType?: any;

  @IsOptional()
  @IsIn(["credit", "debit"])
  type: string;

}

export class RespondToBroadcastDto {
  @IsOptional()
  order_id?: any;

  @IsOptional()
  orderId?: any;

  @IsOptional()
  broadcast_order_id?: any;

  @IsOptional()
  @IsArray()
  items: any[];

  @IsOptional()
  provider_note?: any;

  @IsOptional()
  eta_minutes?: any;

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
