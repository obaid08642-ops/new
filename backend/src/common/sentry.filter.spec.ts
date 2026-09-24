import { HttpStatus } from '@nestjs/common';
import { translateMongoError } from './sentry.filter';
import { idFilter, isObjectIdString } from './id.utils';

describe('P3.2 id-consistency helpers', () => {
  it('CastError -> 404', () => {
    const out = translateMongoError({ name: 'CastError' });
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
    expect(idFilter('68d7e5dd0563d64f3dfa851c')).toEqual({ _id: '68d7e5dd0563d64f3dfa851c' });
    expect(idFilter('usr_123')).toEqual({ id: 'usr_123' });
    expect(isObjectIdString('not-an-id')).toBe(false);
  });
});
