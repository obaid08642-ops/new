/**
 * Owner decision 14 (OD-14): dial 997 and share the location with the family; no ambulance request, dispatch or tracking from our side. The dispatch listeners (nobody emitted their
 * events any more) and the event names are gone; this keeps them from coming back. 997 (EMERGENCY_LINE) and POST /emergency/share-location stay.
 */
import * as fs from 'fs';
import * as path from 'path';
import { EmergencyController } from './emergency.controller';
import { EMERGENCY_LINE } from '../chat/consultation-window';
import { EVENTS } from '../../common/events';

const SRC = path.join(__dirname, '..', '..');
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.ts$/.test(e.name) && !/\.spec\.ts$/.test(e.name) ? [path.join(dir, e.name)] : []));

describe('OD-14: no emergency dispatch in the backend', () => {
  const files = walk(SRC);
  it('no listener of the dispatch events (emergency.triggered / assigned / resolved) and no event constant for them', () => {
    const hits = files.filter((f) => /@OnEvent\(\s*['"]emergency\.(triggered|assigned|resolved)['"]/.test(fs.readFileSync(f, 'utf8')));
    expect(hits.map((f) => path.relative(SRC, f))).toEqual([]);
    expect(Object.keys(EVENTS).filter((k) => k.startsWith('EMERGENCY_'))).toEqual([]);
  });

  it('the emergency module answers one route, POST /emergency/share-location; 997 stays', () => {
    const proto = EmergencyController.prototype as unknown as Record<string, unknown>;
    const routes = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor' && Reflect.hasMetadata('path', proto[n] as object));
    expect(routes.map((n) => [Reflect.getMetadata('path', proto[n] as object), Reflect.getMetadata('method', proto[n] as object)])).toEqual([['share-location', 1]]);
    expect(EMERGENCY_LINE).toBe('997');
  });
});
