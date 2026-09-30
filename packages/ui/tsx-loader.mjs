/**
 * A Node loader that compiles the design system's TSX for the gallery.
 *
 * The gallery in `build-preview.mjs` renders the REAL components so a specimen
 * cannot drift from what a screen gets. Node strips TypeScript types natively but
 * not JSX, so `src/index.tsx` will not import as-is — hence this loader.
 *
 * esbuild is used rather than a hand-rolled transform because it is already a
 * dependency of patient-web (via Next) and a gallery generator that hand-parses
 * JSX is a gallery generator with bugs in it. If esbuild cannot be resolved the
 * loader declines and the gallery falls back to the geometry-only view, so a
 * missing optional dependency degrades the gallery instead of breaking the build.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let esbuild;

export async function initialize() {
  try {
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    esbuild = req('esbuild');
  } catch {
    esbuild = null;
  }
}

export async function resolve(specifier, context, nextResolve) {
  // Node's ESM resolver requires an explicit extension, but TypeScript source
  // says `./Icon` and means `./Icon.tsx`. Bundlers paper over this; a Node loader
  // has to do it explicitly, which is the other half of making `.tsx` importable
  // outside a bundler at all.
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL);
    for (const candidate of [
      `${base.href}.ts`,
      `${base.href}.tsx`,
      `${base.href}/index.ts`,
      `${base.href}/index.tsx`,
    ]) {
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate, format: 'module', shortCircuit: true, ...(await nextResolve(candidate, context)) };
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!esbuild || !url.endsWith('.tsx')) return nextLoad(url, context);

  const result = await esbuild.transform(readFileSync(fileURLToPath(url), 'utf8'), {
    loader: 'tsx',
    format: 'esm',
    target: 'es2022',
    jsx: 'automatic',
    sourcefile: url,
  });

  return { format: 'module', shortCircuit: true, source: result.code };
}
