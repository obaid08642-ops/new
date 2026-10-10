import ur from './locales/ur.json';
import phase5 from './autoTranslationsPhase5.json';
import { autoTranslations } from './index';

const texts = ur as Record<string, string>;

describe('the Urdu riyal (owner 2026-10-10): always the symbol ر.س', () => {
  it('the currency keys are the symbol', () => {
    expect(texts['pharmacy.currency']).toBe('ر.س');
    expect(texts['consult.currency']).toBe('ر.س');
  });

  it('no Urdu text writes the riyal as a word or as the SAR code', () => {
    expect(Object.entries(texts).filter(([, v]) => /ریال|\bSAR\b/.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('price strings put the amount before the symbol', () => {
    expect(texts['pharmacy.price']).toBe('{n} ر.س');
    expect(texts['offers.price']).toBe('{amount} ر.س');
    expect(texts['offers.save']).toContain('{amount} ر.س');
  });

  it('the automatic translation of ر.س into Urdu is the symbol itself', () => {
    expect(autoTranslations['ر.س'].ur).toBe('ر.س');
  });

  it('the generated phrase list has no Urdu riyal word', () => {
    expect(JSON.stringify(phase5)).not.toMatch(/"ur": "[^"]*ریال/);
  });

  it('other languages keep their own writing of the riyal', () => {
    expect(autoTranslations['ر.س'].en).toBe('SAR');
    expect(autoTranslations['ر.س'].ar).toBe('ر.س');
  });
});
