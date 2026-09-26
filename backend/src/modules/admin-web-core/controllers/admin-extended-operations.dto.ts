import { IsArray, IsDefined, IsNumber } from 'class-validator';

export class IssueWarehouseQuotationDto {
  @IsDefined()
  @IsArray()
  pricingItems: any[];

  @IsDefined()
  @IsNumber()
  totalPrice: number;
}
