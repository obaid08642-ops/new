export type DbLang = 'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'tl';
export declare const PUBLIC_CATALOG_LOCALES: readonly ["ar", "en", "ur", "hi", "bn", "fil"];
export declare function missingPublicMedicineTranslations(raw: Record<string, any>): string[];
export declare function localizeMedicineStructured<T extends Record<string, any>>(raw: T, lang?: DbLang): T;
