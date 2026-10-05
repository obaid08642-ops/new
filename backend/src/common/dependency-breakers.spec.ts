// 1c01b92: only SMS had a circuit breaker. Email (Resend), WhatsApp (Infobip),
// S3/R2 uploads and LiveKit server calls had timeouts only, so a dead
// dependency was re-tried (and waited on) by every request. Each now runs
// through CircuitBreakerService: after enough failures the circuit opens and
// requests take the existing fallback without calling the dependency.
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn();
  return {
    __send: send,
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input })),
    GetObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});
jest.mock('livekit-server-sdk', () => {
  const listParticipants = jest.fn();
  return {
    __listParticipants: listParticipants,
    RoomServiceClient: jest.fn().mockImplementation(() => ({ listParticipants })),
    AccessToken: jest.fn(),
  };
});

import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { MailService } from '../modules/mail/mail.module';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { StorageService } from '../modules/storage/storage.module';
import { LiveKitService } from '../modules/livekit/livekit.service';

const FAILURES_TO_OPEN = 10; // CircuitBreakerService default volumeThreshold, 50% errors

describe('external dependencies run behind circuit breakers (1c01b92)', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.clearAllMocks(); });

  it('email: an open Resend circuit goes straight to SES without calling Resend', async () => {
    Object.assign(process.env, { SES_SMTP_HOST: 'smtp.test', SES_SMTP_USER: 'u', SES_SMTP_PASS: 'p', MAIL_TIMEOUT_MS: '1000' });
    const sesSend = jest.fn().mockResolvedValue({ messageId: 'm' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: sesSend });
    const resendSend = jest.fn().mockRejectedValue(new Error('resend down'));
    const mail = new MailService({ emit: jest.fn() } as never, undefined, new CircuitBreakerService());
    Object.assign(mail as unknown as { resend: unknown }, { resend: { emails: { send: resendSend } } });

    for (let i = 0; i < FAILURES_TO_OPEN + 3; i++) {
      await expect(mail.send('a@b.test', 's', '<p>x</p>')).resolves.toMatchObject({ ok: true, provider: 'ses' });
    }
    expect(resendSend).toHaveBeenCalledTimes(FAILURES_TO_OPEN);
    expect(sesSend).toHaveBeenCalledTimes(FAILURES_TO_OPEN + 3);
  });

  it('WhatsApp: an open Infobip circuit stops calling Infobip', async () => {
    Object.assign(process.env, { INFOBIP_API_KEY: 'k', INFOBIP_URL: 'infobip.test', INFOBIP_SENDER: 's' });
    const post = axios.post as jest.Mock;
    post.mockRejectedValue(new Error('infobip down'));
    const svc = new NotificationsService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, new CircuitBreakerService());
    for (let i = 0; i < FAILURES_TO_OPEN + 3; i++) {
      await svc.sendWhatsApp({ title_key: 't', body_key: 'b' }, '+966500000000');
    }
    expect(post).toHaveBeenCalledTimes(FAILURES_TO_OPEN);
  });

  it('S3: an open object-store circuit refuses uploads fast without calling S3', async () => {
    Object.assign(process.env, { S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'k', S3_SECRET_ACCESS_KEY: 's', S3_ENDPOINT: 'https://s3.test' });
    const send = (jest.requireMock('@aws-sdk/client-s3') as { __send: jest.Mock }).__send;
    send.mockRejectedValue(new Error('s3 down'));
    const storage = new StorageService({} as never, new CircuitBreakerService());
    const input = { owner_account_id: 'o', mime: 'image/png', data_base64: Buffer.from('png').toString('base64') };
    for (let i = 0; i < FAILURES_TO_OPEN + 3; i++) {
      await expect(storage.upload(input)).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
    expect(send).toHaveBeenCalledTimes(FAILURES_TO_OPEN);
  });

  it('LiveKit: an open room-service circuit returns the empty list without calling LiveKit', async () => {
    Object.assign(process.env, { LIVEKIT_URL: 'wss://lk.test', LIVEKIT_API_KEY: 'k', LIVEKIT_API_SECRET: 's' });
    const list = (jest.requireMock('livekit-server-sdk') as { __listParticipants: jest.Mock }).__listParticipants;
    list.mockRejectedValue(new Error('livekit down'));
    const lk = new LiveKitService({} as never, {} as never, {} as never, new CircuitBreakerService());
    for (let i = 0; i < FAILURES_TO_OPEN + 3; i++) {
      await expect(lk.getRoomParticipants('room-1')).resolves.toEqual([]);
    }
    expect(list).toHaveBeenCalledTimes(FAILURES_TO_OPEN);
  });
});
