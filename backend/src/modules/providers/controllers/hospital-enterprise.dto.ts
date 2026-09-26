import { IsArray, IsDefined, IsIn, IsMongoId, IsObject, IsString } from 'class-validator';

export class ProvisionSubProviderDto {
  @IsMongoId() hospitalId: string;
  @IsMongoId() branchId: string;
  @IsMongoId() staffUserId: string;
  @IsIn(['BRANCH_DOCTOR', 'BRANCH_NURSE', 'BRANCH_LAB', 'BRANCH_RADIOLOGY', 'BRANCH_PHARMACY']) entityType: string;
  @IsArray() @IsString({ each: true }) permissions: string[];
}

export class GetBranchFinancialsDto {
  @IsDefined()
  @IsMongoId()
  requestorId: string;
}
