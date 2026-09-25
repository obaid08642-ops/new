import { IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePostDto {
  @IsDefined()
  @IsString()
  title: string;

  @IsDefined()
  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  tags?: any[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  is_anonymous?: boolean;
}

export class CreateSessionDto {
  @IsDefined()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDefined()
  @IsDateString()
  scheduled_at: string;

  @IsOptional()
  @IsArray()
  tags?: any[];

  @IsOptional()
  @IsString()
  host_name?: string;

  @IsOptional()
  @IsString()
  host_specialty?: string;
}

export class AddCommentDto {
  @IsDefined()
  @IsString()
  body: string;

  @IsOptional()
  @IsBoolean()
  is_anonymous?: boolean;
}
export class VotePostDto {
  @IsDefined()
  @IsIn(["up", "down"])
  vote: "up" | "down";
}
export class ModeratePostDto {
  @IsDefined()
  @IsIn(["published", "removed"])
  decision: "published" | "removed";
}
export class UpdateSessionStatusDto {
  @IsDefined()
  @IsIn(["live", "ended", "cancelled"])
  status: "cancelled" | "live" | "ended";

  @IsOptional()
  @IsString()
  stream_url?: string;
}
