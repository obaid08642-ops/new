import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../app.module';

// A controller that no imported module lists answers 404 for every route, with no error at boot (the P5.3 merge dropped
// AdminLogsController and AdminMedicalAccessController this way). This spec reads every `@Controller` class under src/
// and fails when the module graph reachable from AppModule does not register it.
type Ctor = { name: string };

function registeredControllers(): Set<string> {
  const seen = new Set<unknown>();
  const out = new Set<string>();
  const visit = (mod: unknown): void => {
    if (!mod || seen.has(mod)) return;
    seen.add(mod);
    const record = mod as { module?: unknown; imports?: unknown[]; controllers?: Ctor[] };
    const target = typeof mod === 'function' ? mod : record.module;
    if (record.module) {
      for (const c of record.controllers || []) out.add(c.name);
      for (const i of record.imports || []) visit(i);
    }
    if (typeof target !== 'function') return;
    for (const c of (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, target) as Ctor[] | undefined) || []) out.add(c.name);
    for (const i of (Reflect.getMetadata(MODULE_METADATA.IMPORTS, target) as unknown[] | undefined) || []) {
      visit(i && typeof i === 'object' && 'forwardRef' in (i as object) ? (i as { forwardRef: () => unknown }).forwardRef() : i);
    }
  };
  visit(AppModule);
  return out;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : sourceFiles(p);
    return e.name.endsWith('.ts') && !/\.(spec|e2e-spec|d)\.ts$/.test(e.name) ? [p] : [];
  });
}

/** `@Controller(...)` followed (through other decorators) by `export class Name`. */
function declaredControllers(): Array<{ name: string; file: string }> {
  const root = path.join(__dirname, '..');
  const found: Array<{ name: string; file: string }> = [];
  for (const file of sourceFiles(root)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/@Controller\([^)]*\)[\s\S]{0,400}?export class (\w+)/g)) found.push({ name: m[1], file: path.relative(root, file) });
  }
  return found;
}

// Controllers in the tree that are not served, each with the reason. Anything else left out of the module graph fails the spec.
const NOT_SERVED = new Set<string>([
  // Demo seeders: registered only when NODE_ENV=test and ALLOW_TEST_SEED=true (F17), so the module lists them behind that condition.
  'AdminPharmacySeedController',
  'ProvidersSeedController',
  // N10 behaviour nudges (POST engagement/events): never wired. No module lists it, no 'engagement-nudges' queue is registered, nothing
  // consumes processNudge, and no client calls the route. Wiring it sends notifications, so it needs an owner decision; reported to the lead.
  'EngagementController',
]);

describe('every @Controller class is registered in a module AppModule reaches', () => {
  it('has no controller left out', () => {
    const registered = registeredControllers();
    const orphans = declaredControllers().filter((c) => !registered.has(c.name) && !NOT_SERVED.has(c.name));
    expect(orphans.map((c) => `${c.name} (${c.file})`)).toEqual([]);
  });

  it('names the two controllers the P5.3 merge dropped', () => {
    const registered = registeredControllers();
    expect(registered.has('AdminLogsController')).toBe(true);
    expect(registered.has('AdminMedicalAccessController')).toBe(true);
  });
});
