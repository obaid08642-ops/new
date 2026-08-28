type Lang = 'ar' | 'en' | 'ur';
export declare const DICTIONARY: Record<string, Record<Lang, string>>;
export declare class I18nService {
    t(key: string, lang?: Lang, params?: Record<string, any>): string;
    all(lang?: Lang): Record<string, string>;
    raw(): Record<string, Record<Lang, string>>;
}
export {};
