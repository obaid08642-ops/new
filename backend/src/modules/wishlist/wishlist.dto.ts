import { IsArray, IsDefined, IsString, ArrayMaxSize, ArrayMinSize } from 'class-validator';

export class ShareWishlistDto {
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  item_ids: string[];
}
