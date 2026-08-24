import { HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { SentryExceptionFilter } from './sentry.filter';

describe('SentryExceptionFilter', () => {
  const capture = jest.spyOn(Sentry, 'captureException').mockImplementation(() => 'event-id' as never);

  beforeEach(() => capture.mockClear());

  function hostFor(response: { status: jest.Mock; json: jest.Mock }) {
    return {
      switchToHttp: () => ({
        getRequest: () => undefined,
        getResponse: () => response,
      }),
    } as any;
  }

  it('returns a public internal-error payload for an unexpected five-hundred error', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const filter = new SentryExceptionFilter({} as any);

    filter.catch(new InternalServerErrorException('mongodb://private-host credential=secret'), hostFor(response));

    expect(capture).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({ code: 'internal_error', message: 'request_failed' });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain('private-host');
  });

  it('preserves an allowlisted provider outage without exposing raw content', () => {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const filter = new SentryExceptionFilter({} as any);

    filter.catch(new HttpException('provider_unavailable', HttpStatus.SERVICE_UNAVAILABLE), hostFor(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.json).toHaveBeenCalledWith({ code: 'provider_unavailable', message: 'provider_unavailable' });
  });
});
