import { IsOptional, IsString } from 'class-validator';

export class BroadcastDto {
  @IsOptional()
  name?: any;
  @IsOptional()
  title?: any;
}

export class CreateCampaignDto {
  scheduled_at?: any;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  deep_link?: any;

}
