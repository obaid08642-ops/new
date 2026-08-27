import 'reflect-metadata';
import { MedicinesController } from './medicines.controller';
import { PERMISSIONS_KEY, Permission } from '../../common/permissions';

function permissionsFor(method: keyof MedicinesController): Permission[] {
  const handler = MedicinesController.prototype[method] as unknown as Function;
  return Reflect.getMetadata(PERMISSIONS_KEY, handler) || [];
}

describe('MedicinesController shortage permissions', () => {
  it('requires catalog read permission to list shortage reports', () => {
    expect(permissionsFor('shortageReports')).toEqual([Permission.CATALOG_READ]);
  });

  it.each(['approveShortage', 'rejectShortage', 'clearBadge', 'setAvailability'] as Array<keyof MedicinesController>)
  ('requires shortage-decision permission for %s', (method) => {
    expect(permissionsFor(method)).toEqual([Permission.CATALOG_SHORTAGE_DECIDE]);
  });
});
