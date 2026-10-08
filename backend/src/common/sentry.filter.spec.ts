import { HttpStatus } from '@nestjs/common';
import { normalizeHttpExceptionBody, translateMongoError } from './sentry.filter';
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

describe('13.R5/D28 response normalizer', () => {
  it('maps 404 to the NOT_FOUND catalog code (never UNKNOWN_ERROR)', () => {
    expect(normalizeHttpExceptionBody(404, 'Not Found')).toEqual({
      code: 'NOT_FOUND',
      message: 'Not Found',
      statusCode: 404,
    });
  });

  it('keeps every original body field and adds statusCode', () => {
    const out = normalizeHttpExceptionBody(400, {
      message: 'quantity must be positive',
      details: { field: 'quantity' },
      kind: 'order',
      domain_state: 'draft',
    }) as Record<string, unknown>;
    expect(out).toMatchObject({
      code: 'INVALID_INPUT',
      message: 'quantity must be positive',
      details: { field: 'quantity' },
      kind: 'order',
      domain_state: 'draft',
      statusCode: 400,
    });
  });

  it('resolves a missing message from the catalog in the request locale', () => {
    const out = normalizeHttpExceptionBody(404, {}, 'ar') as Record<string, unknown>;
    expect(out?.code).toBe('NOT_FOUND');
    expect(typeof out?.message).toBe('string');
    expect((out?.message as string).length).toBeGreaterThan(0);
    expect(out?.message).not.toBe('Unknown error');
    expect(out?.statusCode).toBe(404);
  });

  it('leaves an already-normalized body alone except for statusCode', () => {
    const out = normalizeHttpExceptionBody(403, {
      code: 'INSUFFICIENT_PERMISSION',
      message: 'nope',
    }) as Record<string, unknown>;
    expect(out).toMatchObject({ code: 'INSUFFICIENT_PERMISSION', message: 'nope', statusCode: 403 });
  });
});
