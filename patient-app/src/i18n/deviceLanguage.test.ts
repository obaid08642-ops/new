// Rule 6 (owner, 2026-10-06): the language follows the device, reading every preferred language in order.
import { pickDeviceLanguage } from './deviceLanguage';

describe('pickDeviceLanguage', () => {
  it('takes the first preferred language the app has, not only the first entry', () => {
    expect(pickDeviceLanguage([{ languageCode: 'de' }, { languageCode: 'ur' }, { languageCode: 'en' }])).toBe('ur');
  });

  it('maps Tagalog to Filipino', () => {
    expect(pickDeviceLanguage([{ languageCode: 'tl' }])).toBe('fil');
  });

  it('gives English when the device lists languages but none is supported', () => {
    expect(pickDeviceLanguage([{ languageCode: 'fr' }, { languageCode: 'de' }])).toBe('en');
  });

  it('gives Arabic when the device lists no language', () => {
    expect(pickDeviceLanguage([])).toBe('ar');
  });

  it('ignores entries without a language code', () => {
    expect(pickDeviceLanguage([{ languageCode: null }, { languageCode: 'hi' }])).toBe('hi');
  });
});
