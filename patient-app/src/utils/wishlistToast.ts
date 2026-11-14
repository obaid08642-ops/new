/** The message key of the confirmation after the server accepted a favourites press: what the list is now. */
export const wishlistToastKey = (inListNow: boolean) =>
  (inListNow ? 'pharmacy.wishlist.addedToast' : 'pharmacy.wishlist.removedToast') as 'pharmacy.wishlist.addedToast' | 'pharmacy.wishlist.removedToast';
