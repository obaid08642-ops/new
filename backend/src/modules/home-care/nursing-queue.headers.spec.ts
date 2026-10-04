// dbb1ace review: R4 deleted POST /home-care/bookings but left its decorators
// (@SelfService, Deprecation, Sunset) in place, so they attached to the next
// handler, the live nurse dispatch queue GET /home-care/bookings/nursing/all,
// which then told the provider app it is deprecated with a past Sunset date.
import 'reflect-metadata';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import { SELF_SERVICE_KEY } from '../../common/auth.guard';
import { HomeCareCompatController } from './home-care-compat.module';

describe('nurse dispatch queue route metadata', () => {
  const handler = HomeCareCompatController.prototype.nursingQueue;
  it('carries no Deprecation/Sunset headers', () => {
    const headers = (Reflect.getMetadata(HEADERS_METADATA, handler) || []) as Array<{ name: string }>;
    expect(headers.map((h) => h.name)).not.toEqual(expect.arrayContaining(['Deprecation']));
    expect(headers.map((h) => h.name)).not.toEqual(expect.arrayContaining(['Sunset']));
  });
  it('is not marked self-service (it is a provider queue, the handler checks the role)', () => {
    expect(Reflect.getMetadata(SELF_SERVICE_KEY, handler)).toBeUndefined();
  });
});
