import { BadRequestException, NotFoundException } from '@nestjs/common';
import { REQUIRE_IDEMPOTENCY } from '../../common/idempotency.interceptor';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

function serviceFor(stored: any = null) {
  const service: any = Object.create(UsersService.prototype);
  service.patientRepository = {
    findOne: jest.fn().mockResolvedValue(stored ? { notification_settings: stored } : null),
    updateOne: jest.fn().mockResolvedValue({}),
  };
  service.redisService = { getClient: jest.fn() };
  return service;
}

describe('Users notification/session contract bridge', () => {
  it('normalizes legacy flat settings into the bounded channels/categories DTO', async () => {
    const service = serviceFor({ push: false, sms: false, unexpected: true, categories: { chat: false, secret: true } });

    await expect(service.getNotificationSettings('patient-1')).resolves.toEqual({
      channels: { push: false, email: false, sms: false },
      categories: { appointments: true, orders: true, health: true, chat: false, account: true, marketing: false },
    });
  });

  it('merges only allowlisted boolean channels/categories and persists the safe DTO', async () => {
    const service = serviceFor({ channels: { push: true, email: false, sms: true }, categories: { marketing: false } });

    await expect(service.updateNotificationSettings('patient-1', {
      channels: { email: true }, categories: { marketing: true, chat: false },
    })).resolves.toEqual({
      channels: { push: true, email: true, sms: true },
      categories: { appointments: true, orders: true, health: true, chat: false, account: true, marketing: true },
    });

    expect(service.patientRepository.updateOne).toHaveBeenCalledWith(
      { user_id: 'patient-1' },
      { $set: { notification_settings: expect.objectContaining({ channels: expect.objectContaining({ email: true }) }) } },
      { upsert: true },
    );
  });

  it('rejects unknown keys, NoSQL paths, and non-boolean values', async () => {
    const service = serviceFor();
    await expect(service.updateNotificationSettings('patient-1', { admin: true })).rejects.toThrow(BadRequestException);
    await expect(service.updateNotificationSettings('patient-1', { channels: { '$where': true } })).rejects.toThrow(BadRequestException);
    await expect(service.updateNotificationSettings('patient-1', { categories: { chat: 'yes' } })).rejects.toThrow(BadRequestException);
  });

  it('returns 404 and does not delete when a refresh session does not belong to the caller', async () => {
    const service = serviceFor();
    const client = { sismember: jest.fn().mockResolvedValue(0), del: jest.fn(), srem: jest.fn() };
    service.redisService.getClient.mockReturnValue(client);

    await expect(service.revokeSession('patient-1', 'foreign-jti')).rejects.toThrow(new NotFoundException('session not found'));
    expect(client.del).not.toHaveBeenCalled();
    expect(client.srem).not.toHaveBeenCalled();
  });

  it('marks notification PATCH and session DELETE as idempotency-required', () => {
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, UsersController.prototype.updateNotificationSettings)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_IDEMPOTENCY, UsersController.prototype.revokeSession)).toBe(true);
  });
});
