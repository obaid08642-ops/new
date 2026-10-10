import { NotFoundException } from '@nestjs/common';
import { ArticlesService } from './articles.module';

// D-1 admin review: the admin lists doctor articles waiting for review and reads one in full.
function svcWith(found: any) {
  const lean = jest.fn().mockResolvedValue(found);
  const chain = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean };
  const profiles = { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ id: 'doc-prof-1', name_ar: 'د. واحد' }]) }) };
  const model = { find: jest.fn().mockReturnValue(chain), findOne: jest.fn().mockReturnValue({ lean }), db: { collection: jest.fn(() => profiles) } };
  const svc: any = Object.create(ArticlesService.prototype);
  svc.model = model;
  return { svc, model };
}

describe('admin article review', () => {
  it('narrows the list by a known status and ignores unknown ones', async () => {
    const { svc, model } = svcWith([]);
    await svc.adminList('IN_REVIEW');
    expect(model.find.mock.calls[0][0]).toEqual({ is_deleted: { $ne: true }, status: { $eq: 'IN_REVIEW' } });
    await svc.adminList('{"$ne":1}');
    expect(model.find.mock.calls[1][0]).toEqual({ is_deleted: { $ne: true } });
  });

  it('returns one article with its body, 404 when missing', async () => {
    const { svc, model } = svcWith({ id: 'a1', body_ar: 'نص' });
    await expect(svc.adminOne('a1')).resolves.toMatchObject({ body_ar: 'نص' });
    expect(model.findOne.mock.calls[0][1]).toEqual({ _id: 0, __v: 0 });
    const withAuthor = svcWith({ id: 'a2', author: { doctor_id: 'doc-prof-1' } }).svc;
    await expect(withAuthor.adminOne('a2')).resolves.toMatchObject({ author: { doctor_id: 'doc-prof-1', doctor_name: 'د. واحد' } });
    const missing = svcWith(null).svc;
    await expect(missing.adminOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
