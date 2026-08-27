// src/polyfills.ts — must be imported FIRST in app/_layout.tsx.
// Provides globals that some libraries (e.g. LiveKit) expect at import time.

if (typeof (global as any).DOMException === 'undefined') {
  class DOMExceptionPolyfill extends Error {
    code: number;
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'Error';
      this.code = 0;
    }
  }
  (global as any).DOMException = DOMExceptionPolyfill;
}

export {};
