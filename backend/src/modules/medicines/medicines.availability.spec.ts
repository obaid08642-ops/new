import { NotFoundException } from '@nestjs/common';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';
import { PUBLIC_KEY, ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

/** Owner, 2026-10-16: how many pharmacies stock an item is for a signed-in patient only, from the live inventory. */
describe('GET /medicines/:id/availability', () => {
  const svc = {
    getPublicById: jest.fn(async (id: string) => { if (id !== 'm1') throw new NotFoundException(); return { id }; }),
    aggregateStock: jest.fn(async () => ({ aggregate_stock: 40, pharmacies_count: 3, in_stock: true })),
  };
  const ctl = new MedicinesController(svc as unknown as MedicinesService);

  it('answers the count and nothing else for a public item', async () => {
    await expect(ctl.availability('m1')).resolves.toEqual({ pharmacies_count: 3, in_stock: true });
  });

  it('answers 404 for an item that is not public', async () => {
    await expect(ctl.availability('hidden')).rejects.toBeInstanceOf(NotFoundException);
    expect(svc.aggregateStock).toHaveBeenCalledTimes(1);
  });

  it('is a patient route, not a public one', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, MedicinesController.prototype.availability);
    expect(roles).toEqual([UserRole.PATIENT]);
    expect(Reflect.getMetadata(PUBLIC_KEY, MedicinesController.prototype.availability)).toBeUndefined();
  });
});
