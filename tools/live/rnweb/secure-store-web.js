// AUDIT-ONLY shim (NABD_WEB_TEST=1 builds): expo-secure-store has no web implementation, so a web
// export of the native apps loses the access token. This maps it to localStorage for browser testing.
// Never used by store builds (the alias exists only when NABD_WEB_TEST=1 and platform === 'web').
const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null);
module.exports = {
  getItemAsync: async (k) => (ls() ? ls().getItem(k) : null),
  setItemAsync: async (k, v) => { if (ls()) ls().setItem(k, v); },
  deleteItemAsync: async (k) => { if (ls()) ls().removeItem(k); },
  isAvailableAsync: async () => true,
  getItem: (k) => (ls() ? ls().getItem(k) : null),
  setItem: (k, v) => { if (ls()) ls().setItem(k, v); },
  WHEN_UNLOCKED: 'WHEN_UNLOCKED', AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK', ALWAYS: 'ALWAYS',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY', AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
};
