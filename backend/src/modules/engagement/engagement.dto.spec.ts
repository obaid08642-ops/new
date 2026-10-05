import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EngagementEventDto } from './engagement.dto';
import { StepUpIssueDto } from '../auth/step-up.controller';

// The global ValidationPipe runs with whitelist + forbidNonWhitelisted.
const check = <T extends object>(cls: new () => T, body: Record<string, unknown>) =>
  validate(plainToInstance(cls, body), { whitelist: true, forbidNonWhitelisted: true });
const failedProps = async <T extends object>(cls: new () => T, body: Record<string, unknown>) =>
  (await check(cls, body)).map((e) => e.property).sort();

describe('EngagementEventDto (POST /engagement/events)', () => {
  it('accepts a known kind with its optional fields', async () => {
    expect(await check(EngagementEventDto, { kind: 'medicine', ref_id: 'med-1', query: 'panadol', locale: 'ar' })).toHaveLength(0);
    expect(await check(EngagementEventDto, { kind: 'search_query', locale: 'en' })).toHaveLength(0);
  });

  it('rejects an unknown kind, a non-string kind and a missing kind', async () => {
    expect(await failedProps(EngagementEventDto, { kind: 'wallet', locale: 'ar' })).toEqual(['kind']);
    expect(await failedProps(EngagementEventDto, { kind: 7, locale: 'ar' })).toEqual(['kind']);
    expect(await failedProps(EngagementEventDto, { kind: ['medicine'], locale: 'ar' })).toEqual(['kind']);
    expect(await failedProps(EngagementEventDto, { locale: 'ar' })).toEqual(['kind']);
  });

  it('rejects over-long ids/queries, a missing locale and unknown fields', async () => {
    expect(await failedProps(EngagementEventDto, { kind: 'doctor', ref_id: 'x'.repeat(129), locale: 'ar' })).toEqual(['ref_id']);
    expect(await failedProps(EngagementEventDto, { kind: 'doctor', query: 'q'.repeat(501), locale: 'ar' })).toEqual(['query']);
    expect(await failedProps(EngagementEventDto, { kind: 'doctor' })).toEqual(['locale']);
    expect(await failedProps(EngagementEventDto, { kind: 'doctor', locale: 'ar', user_id: 'someone-else' })).toEqual(['user_id']);
  });
});

describe('StepUpIssueDto (POST /auth/step-up/issue)', () => {
  const assertion = {
    id: 'cred-1', rawId: 'cred-1', type: 'public-key',
    response: { clientDataJSON: 'e30', authenticatorData: 'AA', signature: 'AA' },
    clientExtensionResults: {},
  };

  it('accepts an action with a WebAuthn assertion object (identifier optional and ignored)', async () => {
    expect(await check(StepUpIssueDto, { action: 'payout.approve', response: assertion })).toHaveLength(0);
    expect(await check(StepUpIssueDto, { identifier: 'admin@nabd.plus', action: 'payout.approve', response: assertion })).toHaveLength(0);
  });

  it('rejects a non-object response, non-string action/identifier and over-long values', async () => {
    expect(await failedProps(StepUpIssueDto, { action: 'x', response: 'signed' })).toEqual(['response']);
    expect(await failedProps(StepUpIssueDto, { action: 'x', response: [assertion] })).toEqual(['response']);
    expect(await failedProps(StepUpIssueDto, { action: 42, response: assertion })).toEqual(['action']);
    expect(await failedProps(StepUpIssueDto, { action: 'a'.repeat(321), response: assertion })).toEqual(['action']);
    expect(await failedProps(StepUpIssueDto, { identifier: { $ne: null }, action: 'x', response: assertion })).toEqual(['identifier']);
  });

  it('rejects unknown top-level fields (e.g. a forged token)', async () => {
    expect(await failedProps(StepUpIssueDto, { action: 'x', response: assertion, token: 'forged' })).toEqual(['token']);
  });
});
