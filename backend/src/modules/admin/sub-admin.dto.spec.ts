// Live finding (X4 journey): CreateSubAdminDto/UpdateSubAdminDto validated
// `permissions` as an object, while the controller keeps only string items of
// an array; every create with permissions answered 400 "must be an object".
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSubAdminDto, UpdateSubAdminDto } from './admin.dto';
import { Permission } from '../../common/permissions';

const errs = async (cls: new () => object, body: object) => (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('sub-admin permissions are a list of Permission names', () => {
  for (const cls of [CreateSubAdminDto, UpdateSubAdminDto]) {
    it(`${cls.name} accepts a list of known permissions`, async () => {
      expect(await errs(cls, { permissions: [Object.values(Permission)[0]] })).toEqual([]);
      expect(await errs(cls, { permissions: [] })).toEqual([]);
    });
    it(`${cls.name} refuses an object or an unknown permission`, async () => {
      expect(await errs(cls, { permissions: { a: true } })).toContain('permissions');
      expect(await errs(cls, { permissions: ['not.a.permission'] })).toContain('permissions');
    });
  }
});
