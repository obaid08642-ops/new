import 'reflect-metadata';
import { PUBLIC_KEY, ROLES_KEY } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { MedicinesController } from './medicines.controller';
import { ingredientsVocabulary } from './ingredients';

// Issue 1556 (PR 3): the vocabulary the admin review form offers is admin-only and read-only.
describe('issue 1556 PR 3: the ingredients vocabulary endpoint guard', () => {
  const handler = MedicinesController.prototype.ingredientsVocab;

  it('is restricted to the admin role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
  });

  it('is not public', () => {
    expect(Reflect.getMetadata(PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('returns the closed lists the checker accepts, and nothing else', () => {
    const vocab = ingredientsVocabulary();
    expect(Object.keys(vocab).sort()).toEqual(['dosage_forms', 'inns', 'routes', 'strength_units', 'table_version']);
    expect(vocab.inns).toContain('paracetamol');
    expect(vocab.inns).toEqual([...vocab.inns].sort());
    expect(vocab.dosage_forms).toContain('tablet');
    expect(vocab.routes).toContain('oral');
    expect(vocab.strength_units).toContain('mg');
  });
});
