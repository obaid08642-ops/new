import { ArrayMaxSize, IsArray, IsDefined, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class IssueWarehouseQuotationDto {
  @IsDefined()
  @IsArray()
  @ArrayMaxSize(200)
  // free-form: a priced line of the procurement request (its fields are the request's own item fields); the controller refuses an empty list and any line that is not an object
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
