import { IsDefined, IsIn, IsString } from 'class-validator';

export class VerifyDto {
  platform: any;

  @IsDefined()
  @IsString()
  token: string;

  @IsDefined()
  @IsString()
  nonce: string;
}

export class ChallengeDto {
  @IsDefined()
  @IsIn(["android", "ios"])
  platform: "ios" | "android";
}
export class GuestChallengeDto {
  @IsDefined()
  @IsIn(["android", "ios"])
  platform: "ios" | "android";
}
