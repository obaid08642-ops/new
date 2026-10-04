// F8 review (7351f2b/e64ec70): publishing a catalog item needs CATALOG_APPROVE.
// The single approve route has it; bulk-approve (up to 200 items, same
// adminApproveCatalog call) only required CATALOG_UPDATE, a way around it.
import 'reflect-metadata';
import { Permission, PERMISSIONS_KEY } from '../../common/permissions';
import { MedicinesController } from './medicines.controller';

describe('catalog publishing permissions (F8)', () => {
  const perms = (m: keyof MedicinesController) => Reflect.getMetadata(PERMISSIONS_KEY, MedicinesController.prototype[m]) as Permission[];
  it('single and bulk approve both need CATALOG_APPROVE', () => {
    expect(perms('adminApprove')).toEqual([Permission.CATALOG_APPROVE]);
    expect(perms('adminBulkApprove')).toEqual([Permission.CATALOG_APPROVE]);
  });
});
