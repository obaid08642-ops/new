export declare const ROLE_HIERARCHY: Record<string, string[]>;
export declare function roleSatisfies(required: string | undefined | null, effective: Array<string | undefined | null>): boolean;
export declare const MIN_REASON_LENGTH = 5;
export declare const MIN_FINANCIAL_REASON_LENGTH = 10;
import { BadRequestException } from '@nestjs/common';
export declare class ReasonError extends BadRequestException {
    readonly code: string;
    constructor(code: string);
}
export declare function validateReason(raw: unknown, min?: number): string;
export declare function isFinancialReasonValid(raw: unknown): boolean;
export declare function mergePermissions(...groups: Array<string[] | undefined | null>): string[];
export declare function sanitizePermissions(candidate: unknown, catalog: readonly string[]): string[];
export declare const CUSTOM_ROLE_KEY_RE: RegExp;
