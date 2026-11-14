import { MedicinesService } from './medicines.service';

describe('medicine card projection', () => {
  const projection = (MedicinesService as any).CARD_PROJECTION as Record<string, number>;

  it('drops the long translated text of every language from list cards', () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
      for (const key of ['description', 'how_to_use', 'dosage_instructions', 'search_aliases']) {
        expect(projection[`translations.${lang}.${key}`]).toBe(0);
      }
    }
  });

  it('keeps the translated display names', () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
      expect(projection[`translations.${lang}.name`]).toBeUndefined();
      expect(projection[`translations.${lang}.slug`]).toBeUndefined();
    }
  });
});
