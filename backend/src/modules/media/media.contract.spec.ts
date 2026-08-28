import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MediaController } from './media.controller';

const OWNER = { id: 'patient-1', role: 'patient' };
const OTHER = { id: 'stranger-1', role: 'patient' };

function lean(value: any) { return { lean: jest.fn().mockResolvedValue(value) }; }

function controllerFor(options: { asset?: any; chatThread?: any } = {}) {
  const controller: any = Object.create(MediaController.prototype);
  controller.mediaService = {
    uploadBuffer: jest.fn().mockResolvedValue({ key: 'chat/patient-1/object.pdf' }),
    generatePresignedUploadUrl: jest.fn().mockResolvedValue({ key: 'chat/patient-1/object.pdf', uploadUrl: 'https://signed-upload.example' }),
    generatePresignedDownloadUrl: jest.fn().mockResolvedValue('https://signed-download.example'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };
  controller.assets = {
    create: jest.fn().mockResolvedValue({ id: 'media-1', purpose: 'chat', thread_id: 'thread-1' }),
    findOne: jest.fn().mockReturnValue(lean(options.asset ?? null)),
  };
  const ChatThreadModel = { findOne: jest.fn().mockResolvedValue(options.chatThread ?? null) };
  controller.connection = { model: jest.fn().mockReturnValue(ChatThreadModel) };
  return { controller, ChatThreadModel };
}

describe('MediaController private-asset contract', () => {
  it('rejects a chat upload by a non-participant before storage is invoked', async () => {
    const { controller, ChatThreadModel } = controllerFor({ chatThread: null });
    const file: any = { buffer: Buffer.from('x'), originalname: 'note.pdf', mimetype: 'application/pdf', size: 1 };

    await expect(controller.uploadFile(OTHER, file, 'chat', 'thread-1')).rejects.toThrow(NotFoundException);

    expect(ChatThreadModel.findOne).toHaveBeenCalledWith({ id: 'thread-1', participant_ids: OTHER.id });
    expect(controller.mediaService.uploadBuffer).not.toHaveBeenCalled();
  });

  it('persists a private chat asset owner binding and exposes an ID rather than a public URL', async () => {
    const { controller } = controllerFor({ chatThread: { id: 'thread-1', participant_ids: [OWNER.id] } });
    const file: any = { buffer: Buffer.from('x'), originalname: 'note.pdf', mimetype: 'application/pdf', size: 1 };

    await expect(controller.uploadFile(OWNER, file, 'chat', 'thread-1'))
      .resolves.toEqual({ id: 'media-1', purpose: 'chat', thread_id: 'thread-1' });

    expect(controller.assets.create).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: OWNER.id, purpose: 'chat', thread_id: 'thread-1', key: 'chat/patient-1/object.pdf',
    }));
  });

  it('returns a signed URL to a chat participant but hides the same asset from a stranger', async () => {
    const asset = { id: 'media-1', key: 'chat/patient-1/object.pdf', owner_id: OWNER.id, purpose: 'chat', thread_id: 'thread-1' };
    const allowed = controllerFor({ asset, chatThread: { id: 'thread-1', participant_ids: ['doctor-1'] } });

    await expect(allowed.controller.signedUrl({ id: 'doctor-1' }, 'media-1'))
      .resolves.toEqual({ url: 'https://signed-download.example', expires_in: 900 });
    expect(allowed.controller.mediaService.generatePresignedDownloadUrl).toHaveBeenCalledWith(asset.key, 900);

    const denied = controllerFor({ asset, chatThread: null });
    await expect(denied.controller.signedUrl(OTHER, 'media-1')).rejects.toThrow(NotFoundException);
    expect(denied.controller.mediaService.generatePresignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('rejects arbitrary purposes and cross-purpose thread bindings', async () => {
    const { controller } = controllerFor();
    await expect(controller.assertUploadAllowed(OWNER, 'unknown', undefined)).rejects.toThrow(BadRequestException);
    await expect(controller.assertUploadAllowed(OWNER, 'avatar', 'thread-1')).rejects.toThrow(BadRequestException);
  });
});
