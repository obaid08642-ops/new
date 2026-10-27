jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));

import { wishlistToastKey } from './wishlistToast';
import { message } from '../components/screen/ScreenKit';

describe('favourites confirmation', () => {
  it('says what the list is now, in every language, with no key missing', () => {
    expect(wishlistToastKey(true)).toBe('pharmacy.wishlist.addedToast');
    expect(wishlistToastKey(false)).toBe('pharmacy.wishlist.removedToast');
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      for (const on of [true, false]) {
        const key = wishlistToastKey(on);
        expect(message(lang, key)).not.toBe(key);
      }
    }
  });
});
