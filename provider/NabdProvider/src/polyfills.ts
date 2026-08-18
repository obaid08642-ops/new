// src/polyfills.ts — must be imported FIRST in index.ts.
// LiveKit and other web-oriented libs expect DOMException at import time.

declare const global: any;

if (typeof global.DOMException === 'undefined') {
  class DOMExceptionPolyfill extends Error {
    code: number;
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'Error';
      this.code = 0;
    }
  }
  global.DOMException = DOMExceptionPolyfill;
}

export {};
