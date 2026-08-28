import { I18nService } from './i18n.service';
export declare class I18nController {
    private svc;
    constructor(svc: I18nService);
    bundle(lang: 'ar' | 'en' | 'ur'): Record<string, string>;
    raw(): Record<string, Record<"ar" | "en" | "ur", string>>;
}
