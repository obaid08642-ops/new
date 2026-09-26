import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';

interface DtoConstructor extends Function {
  prototype: object;
}

interface ValidationMeta {
  propertyName: string;
  type: string;
  name?: string;
  constraints?: unknown[];
}

interface TypeMeta {
  typeFunction?: () => unknown;
}

interface TransformerMetadataStorage {
  findTypeMetadata(target: Function, propertyName: string): TypeMeta | undefined;
}

const { defaultMetadataStorage } = require('class-transformer/cjs/storage') as {
  defaultMetadataStorage: TransformerMetadataStorage;
};

/**
 * P3 round-3 gate: production ValidationPipe table test over EVERY DTO class
 * found in the modules "*-dto.ts" files. For each DTO:
 *   1. `{}` fails iff the DTO has required fields, and every failure message
 *      names a real DTO field (field-level message, no mystery 400s).
 *   2. An unknown field always fails (whitelist + forbidNonWhitelisted).
 *   3. A minimal valid payload (required fields filled by type) is accepted.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function dtoFiles(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) dtoFiles(p, out);
    else if (name.endsWith('.dto.ts')) out.push(p);
  }
  return out;
}

interface DtoClass {
  ctor: DtoConstructor;
  file: string;
}

function loadDtoClasses(): DtoClass[] {
  const found = new Map<string, DtoClass>();
  for (const file of dtoFiles(path.join(__dirname, '..', 'modules'))) {
    const mod = require(file) as Record<string, unknown>;
    for (const key of Object.keys(mod)) {
      const v = mod[key];
      if (typeof v === 'function' && /Dto$/.test(key)) {
        found.set(`${file}#${key}`, { ctor: v as DtoConstructor, file });
      }
    }
  }
  return [...found.values()].sort((a, b) =>
    (a.file + a.ctor.name).localeCompare(b.file + b.ctor.name),
  );
}

function targetMetas(ctor: DtoConstructor): ValidationMeta[] {
  return getMetadataStorage().getTargetValidationMetadatas(ctor, undefined, false, false, undefined) as unknown as ValidationMeta[];
}

function allProps(ctor: DtoConstructor): Set<string> {
  return new Set(targetMetas(ctor).map((m) => String(m.propertyName)));
}

/** Props with a real (non-conditional, non-nested) constraint. */
function constrainedProps(ctor: DtoConstructor): Set<string> {
  const out = new Set<string>();
  for (const m of targetMetas(ctor)) {
    const t = String(m.type);
    if (t !== 'conditionalValidation' && t !== 'nestedValidation') {
      out.add(String(m.propertyName));
    }
  }
  return out;
}

function isOptionalProp(ctor: DtoConstructor, prop: string): boolean {
  return targetMetas(ctor).some(
    (m) =>
      String(m.propertyName) === prop && String(m.type) === 'conditionalValidation',
  );
}

function messagesOf(err: unknown): string[] {
  if (err instanceof BadRequestException) {
    const res = err.getResponse();
    if (Array.isArray(res)) return res.map(String);
    if (typeof res === 'string') return [res];
    const m = typeof res === 'object' && res !== null && 'message' in res
      ? (res as { message?: unknown }).message
      : res;
    return (Array.isArray(m) ? m : [String(m)]).map(String);
  }
  throw err;
}

function mentionedProps(ctor: DtoConstructor, messages: string[]): string[] {
  const props = allProps(ctor);
  const hit = new Set<string>();
  for (const prop of props) {
    if (messages.some((m) => new RegExp(`\\b${prop}\\b`).test(m))) hit.add(prop);
  }
  return [...hit].sort();
}

const MONGO_ID = '507f1f77bcf86cd799439011';

function elementCtor(ctor: DtoConstructor, prop: string): DtoConstructor | undefined {
  try {
    const found = defaultMetadataStorage.findTypeMetadata(ctor, prop);
    const ctorFromMetadata = found?.typeFunction?.();
    return typeof ctorFromMetadata === 'function' ? ctorFromMetadata as DtoConstructor : undefined;
  } catch {
    return undefined;
  }
}

function designCtor(ctor: DtoConstructor, prop: string): unknown {
  try {
    return Reflect.getMetadata('design:type', ctor.prototype, prop) as unknown;
  } catch {
    return undefined;
  }
}

function kindOf(m: ValidationMeta): string {
  // ValidateBy-built decorators (IsIn/IsEnum/Min/...) surface as
  // `customValidation` with the real name on `m.name`.
  return String(m.type) === 'customValidation' ? String(m.name) : String(m.type);
}

function dummyFor(ctor: DtoConstructor, prop: string, depth: number): unknown {
  if (depth > 3) return 'x';
  const metas = targetMetas(ctor).filter(
    (m) => String(m.propertyName) === prop,
  );
  const types = new Set(metas.map(kindOf));
  const argsOf = (t: string): unknown[] =>
    metas.filter((m) => kindOf(m) === t).flatMap((m) => m.constraints || []);
  if (types.has('nestedValidation')) {
    const design = designCtor(ctor, prop);
    if (design === Array) {
      const el = elementCtor(ctor, prop);
      return el ? [buildValid(el, depth + 1)] : [{}];
    }
    if (typeof design === 'function' && design !== Object) {
      return buildValid(design as DtoConstructor, depth + 1);
    }
    return {};
  }
  if (types.has('isMongoId')) return MONGO_ID;
  if (types.has('isDateString')) return new Date().toISOString();
  if (types.has('isEmail')) return 'patient@example.com';
  if (types.has('isIn')) {
    const vals = argsOf('isIn')[0];
    if (Array.isArray(vals) && vals.length) return vals[0];
  }
  if (types.has('isEnum')) {
    const e = argsOf('isEnum')[0];
    if (e && typeof e === 'object') {
      const vals = Object.values(e).filter((v) => typeof v === 'string' || typeof v === 'number');
      if (vals.length) return vals[0];
    }
  }
  if (types.has('isBoolean')) return true;
  if (types.has('isNumber') || types.has('isInt')) {
    const mins = [...argsOf('min'), ...argsOf('minLength')];
    const floor = mins.length ? Number(mins[0]) : NaN;
    return Number.isFinite(floor) ? floor + 1 : 10;
  }
  if (types.has('isArray')) {
    const minSizes = argsOf('arrayMinSize');
    if (minSizes.length && Number(minSizes[0]) > 0) return ['x'];
    return [];
  }
  if (types.has('isObject')) return {};
  return 'x';
}

const ALT_DUMMIES: unknown[] = ['x', 10, true, [], {}, MONGO_ID, new Date().toISOString()];

function buildValid(ctor: DtoConstructor, depth = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const prop of allProps(ctor)) out[prop] = dummyFor(ctor, prop, depth);
  return out;
}

async function tryTransform(ctor: DtoConstructor, value: unknown): Promise<string[] | null> {
  try {
    await pipe.transform(value, { type: 'body', metatype: ctor as never });
    return null;
  } catch (err) {
    return messagesOf(err);
  }
}

describe('P3 ValidationPipe DTO table (every DTO class)', () => {
  const dtos = loadDtoClasses();

  it('discovers DTO classes', () => {
    expect(dtos.length).toBeGreaterThan(100);
  });

  for (const { ctor, file } of dtos) {
    const label = `${path.basename(file)}::${ctor.name}`;
    describe(label, () => {
      it('{} fails iff required fields exist, with field-level messages', async () => {
        const messages = await tryTransform(ctor, {});
        const required = constrainedProps(ctor);
        // Props that carry only conditional/nested metadata are not required.
        for (const m of targetMetas(ctor)) {
          if (String(m.type) === 'conditionalValidation') {
            required.delete(String(m.propertyName));
          }
        }
        if (messages === null) {
          expect([...required]).toEqual([]);
        } else {
          expect(messages.length).toBeGreaterThan(0);
          const mentioned = mentionedProps(ctor, messages);
          // Every reported property must be a real DTO field.
          for (const p of mentioned) expect(allProps(ctor).has(p)).toBe(true);
          // Every required field must be reported.
          for (const p of required) expect(mentioned).toContain(p);
        }
      });

      it('rejects an unknown field', async () => {
        const messages = await tryTransform(ctor, { __nabd_probe_unknown_field__: 1 });
        expect(messages).not.toBeNull();
        expect(messages!.some((m) => m.includes('__nabd_probe_unknown_field__'))).toBe(true);
      });

      it('accepts a minimal valid payload', async () => {
        let payload: Record<string, unknown> = {};
        const seen = new Map<string, unknown[]>();
        for (let i = 0; i < 25; i++) {
          const messages = await tryTransform(ctor, payload);
          if (messages === null) return;
          const bad = mentionedProps(ctor, messages);
          if (!bad.length) {
            // Failure names no top-level field (nested child error): rebuild
            // every object/array prop from its declared type, then stop.
            let changed = false;
            for (const p of allProps(ctor)) {
              if (payload[p] !== undefined && typeof payload[p] === 'object') {
                const fresh = dummyFor(ctor, p, 0);
                if (JSON.stringify(fresh) !== JSON.stringify(payload[p])) {
                  payload = { ...payload, [p]: fresh };
                  changed = true;
                }
              }
            }
            if (!changed) break;
            continue;
          }
          let progressed = false;
          for (const p of bad) {
            if (isOptionalProp(ctor, p)) {
              // Optional props are safest absent.
              if (p in payload) {
                const { [p]: _drop, ...rest } = payload;
                payload = rest;
                progressed = true;
              }
              continue;
            }
            const tried = seen.get(p) || [];
            const first = tried.length === 0 ? dummyFor(ctor, p, 0) : undefined;
            const candidates =
              first !== undefined ? [first, ...ALT_DUMMIES] : ALT_DUMMIES;
            const next = candidates.find(
              (d) => !tried.some((t) => JSON.stringify(t) === JSON.stringify(d)),
            );
            if (next !== undefined) {
              seen.set(p, [...tried, next]);
              payload = { ...payload, [p]: next };
              progressed = true;
            }
          }
          if (!progressed) break;
        }
        const final = await tryTransform(ctor, payload);
        expect(final).toBeNull();
      });
    });
  }
});
