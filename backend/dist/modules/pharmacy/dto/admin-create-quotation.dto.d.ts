export declare class QuotationItemDto {
    medicineId: string;
    quantity: number;
    price: number;
}
export declare class AdminCreateQuotationDto {
    items: QuotationItemDto[];
    totalPrice: number;
    adminNotes?: string;
}
