import { IsDefined, IsObject } from 'class-validator';

export class UpdateConfigDto {
  // free-form: system_config values are arbitrary admin-managed JSON documents.
  @IsDefined()
  @IsObject()
  value: Record<string, unknown>;
}
