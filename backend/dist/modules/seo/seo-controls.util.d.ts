export interface SeoControlRow {
    route_key: string;
    indexable: boolean;
}
export declare const ENTITY_ROUTE_KEYS: Record<string, string>;
export declare function controlsMap(rows: Array<SeoControlRow | any>): Map<string, boolean>;
export declare function isTypeIndexable(type: string, controls: Map<string, boolean>): boolean;
export declare function robotsDisallowLines(controls: Map<string, boolean>): string[];
