export type SegmentOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'exists' | 'between';
export interface SegmentRule {
    field: string;
    op: SegmentOp;
    value?: any;
    value2?: any;
}
export interface SegmentDefinition {
    match?: 'all' | 'any';
    rules: SegmentRule[];
}
export declare const SEGMENT_ALLOWED_FIELDS: readonly string[];
export declare function isAllowedField(field: string): boolean;
export declare function compileRule(rule: SegmentRule): Record<string, any>;
export declare function compileSegment(def: SegmentDefinition): Record<string, any>;
