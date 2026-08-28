export declare class ProcurementItemDto {
    medicineId: string;
    quantity: number;
    notes?: string;
}
export declare class CreateProcurementRequestDto {
    items: ProcurementItemDto[];
    comment?: string;
}
