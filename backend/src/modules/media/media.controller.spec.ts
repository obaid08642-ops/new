import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { UserRole } from '../../common/enums';

/**
 * P1 (2026-08-20) + D-32: no one but a platform admin deletes an R2 object BY KEY; the owner of a media file (or an
 * admin) deletes it by the id the upload returned. Either way the object and its `media_assets` row go.
 */
describe('MediaController delete authorization', () => {
  const ASSET = { id: '0b9f3c2e-5d41-4a7e-9c1b-2f6d8e4a1c00', key: 'report/pat-1/x.png', owner_id: 'pat-1' };
  const make = () => {
    const media = { deleteFile: jest.fn(async () => undefined) };
    const assets = {
      findOne: jest.fn((q: any) => ({ lean: async () => (q?.id?.$eq === ASSET.id ? ASSET : null) })),
      deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    };
    const controller = new MediaController(media as any, assets as any, {} as any, {} as any);
    return { controller, media, assets };
  };

  it('a patient cannot delete an object by key', async () => {
    const { controller, media } = make();
    await expect(controller.deleteFile({ id: 'pat-1', role: UserRole.PATIENT }, ASSET.key)).rejects.toBeInstanceOf(ForbiddenException);
    expect(media.deleteFile).not.toHaveBeenCalled();
  });

  it('another patient cannot delete my file by its id', async () => {
    const { controller, media } = make();
    await expect(controller.deleteFile({ id: 'pat-2', role: UserRole.PATIENT }, ASSET.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(media.deleteFile).not.toHaveBeenCalled();
  });

  it('the owner deletes their file by id: object and row removed', async () => {
    const { controller, media, assets } = make();
    await controller.deleteFile({ id: 'pat-1', role: UserRole.PATIENT }, ASSET.id);
    expect(media.deleteFile).toHaveBeenCalledWith(ASSET.key);
    expect(assets.deleteOne).toHaveBeenCalledWith({ id: { $eq: ASSET.id } });
  });

  it('an admin deletes by key: object and its row removed', async () => {
    const { controller, media, assets } = make();
    await controller.deleteFile({ id: 'adm-1', role: UserRole.ADMIN }, ASSET.key);
    expect(media.deleteFile).toHaveBeenCalledWith(ASSET.key);
    expect(assets.deleteOne).toHaveBeenCalledWith({ key: { $eq: ASSET.key } });
  });
});
