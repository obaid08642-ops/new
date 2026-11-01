import { ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class IssueWarehouseQuotationDto {
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsObject({ each: true }) // free-form: a priced line of the procurement request; its fields are the request's own item fields
  pricingItems: any[];

  @IsDefined()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100000000)
  totalPrice: number;

  /** Why the quote was issued (kept on the request with the admin and the time). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
