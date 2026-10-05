// Q90: medicines store Filipino under translations.tl (scripts/import-catalog-v14.ts,
// med-i18n DB_TRANSLATION_LOCALES, publicCatalogFragment). The R19 normaliser folded
// tl into `fil`, so an admin's Filipino name was saved where no reader looks and the
// fil public page kept the English name.
import { MedicinesService } from './medicines.service';

type Norm = { normalizeTranslationsMap(i: unknown): Record<string, Record<string, string>>; mergeTranslations(a: unknown, b: unknown): Record<string, Record<string, string>> };
const svc = Object.create(MedicinesService.prototype) as Norm;

describe('medicine translations keep the DB key tl for Filipino (Q90)', () => {
  it('an admin `fil` edit is stored under tl', () => {
    expect(svc.normalizeTranslationsMap({ fil: { name: 'Paracetamol (FIL)' } })).toEqual({ tl: { name: 'Paracetamol (FIL)' } });
  });
  it('merging a fil edit into an imported tl entry updates that entry', () => {
    const merged = svc.mergeTranslations({ tl: { name: 'old', how_to_use: 'keep' } }, { fil: { name: 'new' } });
    expect(merged.tl).toEqual({ name: 'new', how_to_use: 'keep' });
    expect(merged).not.toHaveProperty('fil');
  });
});
