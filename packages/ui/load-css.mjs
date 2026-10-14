/**
 * The component stylesheet with its `@import`s inlined, for the static renderers
 * (build-preview, build-compare), which put CSS in one <style> element. A Next
 * app imports components/components.css directly and lets its bundler resolve
 * the imports.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function loadCss(file) {
  return readFileSync(file, 'utf8').replace(/^@import "([^"]+)";$/gm, (_, rel) => loadCss(join(dirname(file), rel)));
}
