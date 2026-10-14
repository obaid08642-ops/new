import { HttpStatus } from '@nestjs/common';
import { translateMongoError, sentryUserContext } from './sentry.filter';
import { idFilter, isObjectIdString } from './id.utils';
import { Types } from 'mongoose';

describe('P3.2 id-consistency helpers', () => {
  it('CastError -> 404', () => {
    const out = translateMongoError({ name: 'CastError' });
    expect(out?.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });
  it('BSONError -> 404', () => {
    const out = translateMongoError({ name: 'BSONError' });
    expect(out?.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });
  it('ValidationError -> 400', () => {
    const out = translateMongoError({ name: 'ValidationError' });
    expect(out?.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });
  it('duplicate key -> 409', () => {
    const out = translateMongoError({ name: 'MongoServerError', code: 11000 });
    expect(out?.getStatus()).toBe(HttpStatus.CONFLICT);
  });
  it('HttpException passes through (null)', () => {
    const { BadRequestException } = jest.requireActual('@nestjs/common') as typeof import('@nestjs/common');
    expect(translateMongoError(new BadRequestException('x'))).toBeNull();
  });
  it('unknown error passes through (null)', () => {
    expect(translateMongoError(new Error('boom'))).toBeNull();
    expect(translateMongoError(null)).toBeNull();
  });
  it('idFilter routes ObjectId vs string id', () => {
    expect(idFilter('68d7e5dd0563d64f3dfa851c')).toEqual({ _id: { $eq: new Types.ObjectId('68d7e5dd0563d64f3dfa851c') } });
    expect(idFilter('usr_123')).toEqual({ id: { $eq: 'usr_123' } });
    expect(isObjectIdString('not-an-id')).toBe(false);
    expect(isObjectIdString('abcdefghijkl')).toBe(false);
  });
});

/**
 * Phase 13, task 13.R5: Sentry is a third-party processor. It must never receive the patient's
 * e-mail address or real name, only the account id.
 */
describe('13.R5 Sentry user context carries no patient contact data', () => {
  it('sends the id only, dropping email and name', () => {
    expect(sentryUserContext({ id: 'usr_1', email: 'sara@example.com', name: 'سارة' }))
      .toEqual({ id: 'usr_1' });
  });

  it('never leaks the e-mail even when it is the only other field', () => {
    const ctx = sentryUserContext({ id: 'usr_2', email: 'sara@example.com' });
    expect(JSON.stringify(ctx)).not.toMatch(/sara@example\.com/);
    expect(Object.keys(ctx)).toEqual(['id']);
  });

  it('never leaks the patient name as a username', () => {
    const ctx = sentryUserContext({ id: 'usr_3', name: 'سارة الحربي' });
    expect(Object.keys(ctx)).toEqual(['id']);
    expect(ctx).not.toHaveProperty('username');
  });

  it('falls back to account_id when only that is present', () => {
    expect(sentryUserContext({ account_id: 'acc_9' })).toEqual({ id: 'acc_9' });
  });

  it('survives a user with no identifiers instead of throwing', () => {
    expect(sentryUserContext({})).toEqual({ id: '' });
    expect(sentryUserContext(null)).toEqual({ id: '' });
    expect(sentryUserContext(undefined)).toEqual({ id: '' });
  });
});
