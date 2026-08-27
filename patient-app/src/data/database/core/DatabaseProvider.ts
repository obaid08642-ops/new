// Platform-neutral typecheck fallback. Expo Metro resolves DatabaseProvider.web.ts
// or DatabaseProvider.native.ts first at runtime; this file keeps tsc and IDE
// resolution stable when platform suffixes are not modelled by TypeScript.
export { DatabaseProvider } from './DatabaseProvider.native';
