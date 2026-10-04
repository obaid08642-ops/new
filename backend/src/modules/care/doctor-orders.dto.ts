import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDoctorOrderDto {
  @IsString() @MaxLength(64) appointment_id: string;
  @IsIn(['lab', 'radiology', 'nursing']) kind: 'lab' | 'radiology' | 'nursing';
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsString({ each: true }) service_ids: string[];
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
